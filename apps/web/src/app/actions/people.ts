'use server';

import {
  createInvitation,
  defaultLocale,
  deliverInvitation,
  discardInvitedUser,
  err,
  extendInvitation,
  fieldErrors,
  getMemberIdByEmail,
  inviteInput,
  isLocale,
  ok,
  revokeInvitation as revokeInvitationRow,
  setMemberActive as setMemberActiveRow,
  updateMember as updateMemberRow,
  updateMemberInput,
  type Locale,
  type Result,
} from '@tadriss/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { env } from '@/env';
import type { FormState } from '@/lib/form-state';
import { requireAdmin } from '@/lib/require-admin';
import { getAdminClient } from '@/lib/supabase/admin';

const echo = (fd: FormData, names: string[]) =>
  Object.fromEntries(
    names.map((n) => {
      const v = fd.get(n);
      return [n, typeof v === 'string' ? v : ''];
    }),
  );

// Root-params don't work in Server Actions, so forms post their locale.
const localeOf = (fd: FormData): Locale => {
  const l = fd.get('locale');
  return isLocale(l) ? l : defaultLocale;
};

const refresh = () => {
  revalidatePath('/[locale]/dashboard/teachers', 'page');
  revalidatePath('/[locale]/dashboard/students', 'page');
  revalidatePath('/[locale]/dashboard', 'page');
};

const redirectTo = (locale: Locale) => `${env.NEXT_PUBLIC_APP_URL}/auth/confirm?locale=${locale}`;

export async function inviteMember(_prev: FormState, fd: FormData): Promise<FormState> {
  const locale = localeOf(fd);
  const values = echo(fd, ['firstName', 'lastName', 'email', 'role']);
  const parsed = inviteInput.safeParse({
    firstName: fd.get('firstName'),
    lastName: fd.get('lastName'),
    email: fd.get('email'),
    role: fd.get('role'),
  });
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error, values };
  const { supabase, institutionId } = auth.data;

  const invitation = await createInvitation(supabase, institutionId, parsed.data);
  if (!invitation.ok) return { error: invitation.error, values };

  const sent = await deliverInvitation(getAdminClient(), {
    invitationId: invitation.data.id,
    email: parsed.data.email,
    locale,
    redirectTo: redirectTo(locale),
  });
  if (!sent.ok) {
    // No email went out, so don't leave a pending invitation that blocks a retry.
    await revokeInvitationRow(supabase, invitation.data.id);
    return { error: sent.error, values };
  }

  refresh();
  return { done: true, values: { email: parsed.data.email } };
}

const idInput = z.uuid();

export async function resendInvitation(id: string, locale: Locale): Promise<Result<null>> {
  if (!idInput.safeParse(id).success || !isLocale(locale)) return err('validation');
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const extended = await extendInvitation(auth.data.supabase, id);
  if (!extended.ok) return extended;
  const sent = await deliverInvitation(getAdminClient(), {
    invitationId: id,
    email: extended.data.email,
    locale,
    redirectTo: redirectTo(locale),
  });
  if (!sent.ok) return sent;
  refresh();
  return ok(null);
}

export async function revokeInvitation(id: string): Promise<Result<null>> {
  if (!idInput.safeParse(id).success) return err('validation');
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { supabase } = auth.data;

  const revoked = await revokeInvitationRow(supabase, id);
  if (!revoked.ok) return revoked;

  // The invited auth user (and its profile) exists only to receive the email: remove it so the
  // address can be invited again. Never fails the revoke itself: the invitation is already closed.
  const member = await getMemberIdByEmail(supabase, revoked.data.email);
  if (member.ok) await discardInvitedUser(getAdminClient(), member.data);

  refresh();
  return ok(null);
}

const activeInput = z.object({ id: z.uuid(), active: z.boolean() });

export async function setMemberActive(id: string, active: boolean): Promise<Result<null>> {
  if (!activeInput.safeParse({ id, active }).success) return err('validation');
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const res = await setMemberActiveRow(auth.data.supabase, id, active);
  if (res.ok) refresh();
  return res;
}

export async function updateMember(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd, ['firstName', 'lastName']);
  const parsed = updateMemberInput.safeParse({
    id: fd.get('id'),
    firstName: fd.get('firstName'),
    lastName: fd.get('lastName'),
  });
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error, values };
  const res = await updateMemberRow(auth.data.supabase, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true };
}
