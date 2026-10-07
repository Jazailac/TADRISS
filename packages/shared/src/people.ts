import type { TadrissClient } from './client';
import { authErrorCode } from './auth';
import { err, ok, toErrorCode, type Result } from './result';
import type { Locale } from './locale';
import type { InviteInput, MemberRole, UpdateMemberInput } from './schemas/people';

export const PEOPLE_PAGE_SIZE = 20;
export const INVITATION_TTL_DAYS = 7;

export type PeopleStatus = 'all' | 'active' | 'inactive';

export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: MemberRole;
  isActive: boolean;
  /** An invitation is still open: the person has not signed in yet. */
  invited: boolean;
  locale: Locale | null;
  createdAt: string;
};

export type PeoplePage = { rows: Person[]; total: number; page: number; pageSize: number };

/**
 * PostgREST `or()` filters are comma/paren-delimited strings, so user text must not be able to
 * inject filter syntax. We keep letters (any script), digits, spaces and a few name/email
 * characters, and drop everything else (including `%` and `_` wildcards).
 */
export function sanitizeSearch(q: string): string {
  return q
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s@.'’-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export type ListPeopleOptions = {
  role: MemberRole;
  status?: PeopleStatus;
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listPeople(
  client: TadrissClient,
  opts: ListPeopleOptions,
): Promise<Result<PeoplePage>> {
  const pageSize = opts.pageSize ?? PEOPLE_PAGE_SIZE;
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const from = (page - 1) * pageSize;

  let query = client
    .from('profiles')
    .select('id, first_name, last_name, email, role, is_active, locale, created_at', {
      count: 'exact',
    })
    .eq('role', opts.role)
    .is('deleted_at', null)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .order('id', { ascending: true })
    .range(from, from + pageSize - 1);

  if (opts.status === 'active') query = query.eq('is_active', true);
  if (opts.status === 'inactive') query = query.eq('is_active', false);

  const q = sanitizeSearch(opts.q ?? '');
  if (q) {
    const term = `%${q}%`;
    query = query.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`);
  }

  const { data, count, error } = await query;
  if (error) return err(toErrorCode(error));

  const emails = data.flatMap((r) => (r.email ? [r.email] : []));
  const pending = new Set<string>();
  if (emails.length > 0) {
    const inv = await client
      .from('invitations')
      .select('email')
      .eq('status', 'pending')
      .in('email', emails);
    if (inv.error) return err(toErrorCode(inv.error));
    for (const i of inv.data) pending.add(i.email);
  }

  return ok({
    rows: data.map((r) => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      role: r.role as MemberRole,
      isActive: r.is_active,
      invited: r.email !== null && pending.has(r.email),
      locale: r.locale as Locale | null,
      createdAt: r.created_at,
    })),
    total: count ?? 0,
    page,
    pageSize,
  });
}

export type InvitationState = 'pending' | 'expired' | 'accepted' | 'revoked';

export type Invitation = {
  id: string;
  email: string;
  role: MemberRole;
  firstName: string;
  lastName: string;
  state: InvitationState;
  expiresAt: string;
  createdAt: string;
};

/** `pending` rows past their expiry are shown as `expired` (no job flips them in the DB). */
export function invitationState(
  row: { status: string; expires_at: string },
  now: Date = new Date(),
): InvitationState {
  if (row.status === 'accepted') return 'accepted';
  if (row.status === 'revoked') return 'revoked';
  return new Date(row.expires_at).getTime() <= now.getTime() ? 'expired' : 'pending';
}

/** Open invitations (pending or expired) for one role, newest first. */
export async function listOpenInvitations(
  client: TadrissClient,
  role: MemberRole,
): Promise<Result<Invitation[]>> {
  const { data, error } = await client
    .from('invitations')
    .select('id, email, role, first_name, last_name, status, expires_at, created_at')
    .eq('role', role)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return err(toErrorCode(error));
  return ok(
    data.map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role as MemberRole,
      firstName: r.first_name,
      lastName: r.last_name,
      state: invitationState(r),
      expiresAt: r.expires_at,
      createdAt: r.created_at,
    })),
  );
}

/** Inserts the invitation row. RLS limits this to admins of `institutionId`. */
export async function createInvitation(
  client: TadrissClient,
  institutionId: string,
  input: InviteInput,
): Promise<Result<{ id: string }>> {
  const { data, error } = await client
    .from('invitations')
    .insert({
      institution_id: institutionId,
      email: input.email,
      role: input.role,
      first_name: input.firstName,
      last_name: input.lastName,
    })
    .select('id')
    .single();
  if (error) return err(toErrorCode(error));
  return ok({ id: data.id });
}

/** Revokes a pending invitation. `not_found` when it was already accepted/revoked or is not yours. */
export async function revokeInvitation(
  client: TadrissClient,
  id: string,
): Promise<Result<{ email: string }>> {
  const { data, error } = await client
    .from('invitations')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('email');
  if (error) return err(toErrorCode(error));
  const row = data[0];
  return row ? ok({ email: row.email }) : err('not_found');
}

/** Pushes the expiry of a pending invitation out by a fresh TTL (the "resend" half). */
export async function extendInvitation(
  client: TadrissClient,
  id: string,
): Promise<Result<{ email: string }>> {
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 86_400_000).toISOString();
  const { data, error } = await client
    .from('invitations')
    .update({ expires_at: expiresAt })
    .eq('id', id)
    .eq('status', 'pending')
    .select('email');
  if (error) return err(toErrorCode(error));
  const row = data[0];
  return row ? ok({ email: row.email }) : err('not_found');
}

/** Activates or deactivates a teacher/student. RLS forbids touching admins or yourself. */
export async function setMemberActive(
  client: TadrissClient,
  id: string,
  active: boolean,
): Promise<Result<null>> {
  const { data, error } = await client
    .from('profiles')
    .update({ is_active: active })
    .eq('id', id)
    .select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}

export async function updateMember(
  client: TadrissClient,
  input: UpdateMemberInput,
): Promise<Result<null>> {
  const { data, error } = await client
    .from('profiles')
    .update({ first_name: input.firstName, last_name: input.lastName })
    .eq('id', input.id)
    .select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}

export type PeopleCounts = { active: number; inactive: number; invited: number };

/** Header numbers for a role. Three cheap head-only counts, run in parallel. */
export async function countPeople(
  client: TadrissClient,
  role: MemberRole,
): Promise<Result<PeopleCounts>> {
  const base = () =>
    client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', role);
  const [active, inactive, invited] = await Promise.all([
    base().eq('is_active', true).is('deleted_at', null),
    base().eq('is_active', false).is('deleted_at', null),
    client
      .from('invitations')
      .select('id', { count: 'exact', head: true })
      .eq('role', role)
      .eq('status', 'pending'),
  ]);
  const failed = active.error ?? inactive.error ?? invited.error;
  if (failed) return err(toErrorCode(failed));
  return ok({
    active: active.count ?? 0,
    inactive: inactive.count ?? 0,
    invited: invited.count ?? 0,
  });
}

/**
 * Sends the invitation email through Supabase Auth's admin API. Needs the service-role client
 * (server-only). `invited_at` set by this endpoint is what `handle_new_user` trusts (ADR 0012).
 */
export async function deliverInvitation(
  admin: TadrissClient,
  opts: { invitationId: string; email: string; locale: Locale; redirectTo: string },
): Promise<Result<{ userId: string }>> {
  const { data, error } = await admin.auth.admin.inviteUserByEmail(opts.email, {
    redirectTo: opts.redirectTo,
    data: {
      signup_intent: 'accept_invitation',
      invitation_id: opts.invitationId,
      locale: opts.locale,
    },
  });
  if (error) return err(authErrorCode(error));
  return ok({ userId: data.user.id });
}

/**
 * Deletes the auth user behind an invitation that was never accepted (profile cascades).
 * Refuses when the user has ever signed in or was not created by an invitation.
 */
export async function discardInvitedUser(
  admin: TadrissClient,
  userId: string,
): Promise<Result<null>> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) return err('not_found');
  if (!data.user.invited_at || data.user.last_sign_in_at) return err('conflict');
  const del = await admin.auth.admin.deleteUser(userId);
  return del.error ? err(authErrorCode(del.error)) : ok(null);
}

/** The profile id for an email inside the caller's institution (RLS-scoped), if any. */
export async function getMemberIdByEmail(
  client: TadrissClient,
  email: string,
): Promise<Result<string>> {
  const { data, error } = await client
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (error) return err(toErrorCode(error));
  return data ? ok(data.id) : err('not_found');
}
