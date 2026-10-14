import { z } from 'zod';
import type { TadrissClient } from './client';
import { err, ok, toErrorCode, type ErrorCode, type Result } from './result';
import type { Locale } from './locale';
import type { LoginInput, SignupInput } from './schemas/auth';

export const roles = ['super_admin', 'institution_admin', 'teacher', 'student', 'parent'] as const;
export type Role = (typeof roles)[number];

/** Where each role lands after signing in. Route protection uses the same map. */
export const homePath: Record<Role, string> = {
  super_admin: '/admin',
  institution_admin: '/dashboard',
  teacher: '/teacher',
  student: '/student',
  parent: '/parent',
};

/** Path prefixes and the single role allowed under each. */
export const protectedAreas: readonly { prefix: string; role: Role }[] = [
  { prefix: '/dashboard', role: 'institution_admin' },
  { prefix: '/teacher', role: 'teacher' },
  { prefix: '/student', role: 'student' },
  { prefix: '/parent', role: 'parent' },
  { prefix: '/admin', role: 'super_admin' },
];

export function areaFor(pathname: string): Role | null {
  const hit = protectedAreas.find(
    (a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`),
  );
  return hit?.role ?? null;
}

const claimsSchema = z.object({
  sub: z.string(),
  user_role: z.enum(roles).optional(),
  institution_id: z.uuid().nullable().optional(),
});

export type Session = { userId: string; role: Role | null; institutionId: string | null };

/** Reads the tenant claims set by the Custom Access Token Hook (ADR 0010). */
export function readClaims(claims: unknown): Session | null {
  const parsed = claimsSchema.safeParse(claims);
  if (!parsed.success) return null;
  return {
    userId: parsed.data.sub,
    role: parsed.data.user_role ?? null,
    institutionId: parsed.data.institution_id ?? null,
  };
}

/** Maps Supabase Auth error codes to our stable codes. */
export function authErrorCode(
  e: { code?: string | null; status?: number } | null | undefined,
): ErrorCode {
  switch (e?.code) {
    case 'invalid_credentials':
      return 'invalid_credentials';
    case 'email_not_confirmed':
      return 'email_not_confirmed';
    case 'user_already_exists':
    case 'email_exists':
      return 'email_taken';
    case 'weak_password':
    case 'validation_failed':
      return 'validation';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'rate_limited';
    case 'user_banned':
      return 'account_disabled';
    default:
      return e?.status === 429 ? 'rate_limited' : 'unknown';
  }
}

export async function currentSession(client: TadrissClient): Promise<Session | null> {
  const { data } = await client.auth.getClaims();
  return data ? readClaims(data.claims) : null;
}

/** Signs in and returns the role from the fresh token. No role = deactivated or unprovisioned. */
export async function signIn(client: TadrissClient, input: LoginInput): Promise<Result<Session>> {
  const { error } = await client.auth.signInWithPassword(input);
  if (error) return err(authErrorCode(error));
  const session = await currentSession(client);
  if (!session?.role) {
    await client.auth.signOut();
    return err('account_disabled');
  }
  return ok(session);
}

/**
 * Self-serve sign-up: the `create_institution` intent makes the onboarding trigger create
 * the institution and the admin profile in the same transaction (migration 0002).
 */
export async function signUp(
  client: TadrissClient,
  input: SignupInput,
  opts: { locale: Locale; emailRedirectTo: string },
): Promise<Result<{ needsConfirmation: boolean }>> {
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: opts.emailRedirectTo,
      data: {
        signup_intent: 'create_institution',
        institution_name: input.institutionName,
        first_name: input.firstName,
        last_name: input.lastName,
        locale: opts.locale,
      },
    },
  });
  if (error) return err(authErrorCode(error));
  // With email confirmation on, Supabase returns a user with no identities for an existing
  // address (to avoid leaking which emails exist). Treat it as "check your email".
  return ok({ needsConfirmation: data.session === null });
}

export async function signOut(client: TadrissClient): Promise<Result<null>> {
  // 'local': ending a session on one device must not log the person out of their other devices.
  // Deactivation does not rely on sign-out: claims vanish at the next refresh and getMyProfile
  // rejects inactive users immediately.
  const { error } = await client.auth.signOut({ scope: 'local' });
  return error ? err(authErrorCode(error)) : ok(null);
}

export type MyProfile = {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
  locale: Locale | null;
  institution: { id: string; name: string; slug: string; timezone: string } | null;
};

/** The signed-in user's profile and institution (RLS limits it to their own row). */
export async function getMyProfile(
  client: TadrissClient,
  userId: string,
): Promise<Result<MyProfile>> {
  const { data, error } = await client
    .from('profiles')
    .select(
      'id, role, first_name, last_name, locale, is_active, institution:institutions(id, name, slug, timezone)',
    )
    .eq('id', userId)
    .single();
  if (error) return err(toErrorCode(error));
  // A deactivated user's access token stays valid until it expires (up to jwt_expiry), but
  // their claims are gone from the next refresh. Cut them off now rather than then.
  if (!data.is_active) return err('account_disabled');
  return ok({
    id: data.id,
    role: data.role as Role,
    firstName: data.first_name,
    lastName: data.last_name,
    locale: data.locale as Locale | null,
    institution: data.institution,
  });
}

/** Sets the signed-in user's password (first password after an invitation, or a change). */
export async function setPassword(client: TadrissClient, password: string): Promise<Result<null>> {
  const { error } = await client.auth.updateUser({ password });
  return error ? err(authErrorCode(error)) : ok(null);
}
