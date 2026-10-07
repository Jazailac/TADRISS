'use server';

import {
  areaFor,
  currentSession,
  defaultLocale,
  fieldErrors,
  homePath,
  isLocale,
  loginInput,
  setPassword,
  setPasswordInput,
  signIn,
  signOut,
  signUp,
  signupInput,
  type ErrorCode,
  type Locale,
  type Role,
  type ValidationKey,
} from '@tadriss/shared';
import { env } from '@/env';
import { redirect } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';

/** useActionState state for the auth forms. */
export type AuthState = {
  error?: ErrorCode;
  fields?: Partial<Record<string, ValidationKey>>;
  notice?: 'check_email';
  /** Non-secret fields echoed back so React's post-action form reset doesn't wipe them. */
  values?: Record<string, string>;
} | null;

const echo = (fd: FormData, names: string[]) =>
  Object.fromEntries(
    names.map((n) => {
      const v = fd.get(n);
      return [n, typeof v === 'string' ? v : ''];
    }),
  );

// next/root-params is not available in Server Actions: the form posts its locale.
const localeOf = (fd: FormData): Locale => {
  const l = fd.get('locale');
  return isLocale(l) ? l : defaultLocale;
};

/** Only same-site paths inside the user's own area are honoured as `next`. */
function safeNext(next: FormDataEntryValue | null, role: Role): string | null {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return null;
  return areaFor(next) === role ? next : null;
}

export async function login(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const locale = localeOf(fd);
  const parsed = loginInput.safeParse({ email: fd.get('email'), password: fd.get('password') });
  const values = echo(fd, ['email']);
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const supabase = await getServerClient();
  const res = await signIn(supabase, parsed.data);
  if (!res.ok) return { error: res.error, values };

  const role = res.data.role ?? 'student';
  return redirect({ href: safeNext(fd.get('next'), role) ?? homePath[role], locale });
}

export async function signup(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const locale = localeOf(fd);
  const parsed = signupInput.safeParse({
    institutionName: fd.get('institutionName'),
    firstName: fd.get('firstName'),
    lastName: fd.get('lastName'),
    email: fd.get('email'),
    password: fd.get('password'),
  });
  const values = echo(fd, ['institutionName', 'firstName', 'lastName', 'email']);
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const supabase = await getServerClient();
  const res = await signUp(supabase, parsed.data, {
    locale,
    emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?locale=${locale}`,
  });
  if (!res.ok) return { error: res.error, values };
  if (res.data.needsConfirmation) return { notice: 'check_email' };
  return redirect({ href: homePath.institution_admin, locale });
}

export async function logout(fd: FormData): Promise<void> {
  const supabase = await getServerClient();
  await signOut(supabase);
  redirect({ href: '/login', locale: localeOf(fd) });
}

/** First password after accepting an invitation. Needs the session `/auth/confirm` created. */
export async function choosePassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const locale = localeOf(fd);
  const parsed = setPasswordInput.safeParse({
    password: fd.get('password'),
    confirm: fd.get('confirm'),
  });
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error) };

  const supabase = await getServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return redirect({ href: '/login?error=link', locale });

  const res = await setPassword(supabase, parsed.data.password);
  if (!res.ok) return { error: res.error };

  const session = await currentSession(supabase);
  return redirect({ href: homePath[session?.role ?? 'student'], locale });
}
