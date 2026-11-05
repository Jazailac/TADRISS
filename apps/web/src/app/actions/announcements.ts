'use server';

import {
  announcementInput,
  createAnnouncement,
  err,
  fieldErrors,
  markAnnouncementsRead,
  setAnnouncementArchived,
  setAnnouncementPinned,
  updateAnnouncement,
  updateAnnouncementInput,
  type Result,
} from '@tadriss/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { FormState } from '@/lib/form-state';
import { requireRole } from '@/lib/require-admin';

const echo = (fd: FormData, names: string[]) =>
  Object.fromEntries(
    names.map((n) => {
      const v = fd.get(n);
      return [n, typeof v === 'string' ? v : ''];
    }),
  );

// Announcements show in three areas and drive the nav badges in the shared layout.
const refresh = () => {
  revalidatePath('/[locale]', 'layout');
};

const FIELDS = ['audience', 'title', 'body'];

export async function createAnnouncementAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd, FIELDS);
  const parsed = announcementInput.safeParse({
    audience: fd.get('audience'),
    title: fd.get('title'),
    body: fd.get('body'),
  });
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const actor = await requireRole(['institution_admin', 'teacher']);
  if (!actor.ok) return { error: actor.error, values };
  const res = await createAnnouncement(actor.data.supabase, actor.data.institutionId, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true, values: { id: res.data.id } };
}

export async function updateAnnouncementAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd, ['title', 'body']);
  const parsed = updateAnnouncementInput.safeParse({
    id: fd.get('id'),
    title: fd.get('title'),
    body: fd.get('body'),
  });
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const actor = await requireRole(['institution_admin', 'teacher']);
  if (!actor.ok) return { error: actor.error, values };
  const res = await updateAnnouncement(actor.data.supabase, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true };
}

export async function archiveAnnouncementAction(
  id: string,
  archived: boolean,
): Promise<Result<null>> {
  if (!z.uuid().safeParse(id).success) return err('validation');
  const actor = await requireRole(['institution_admin', 'teacher']);
  if (!actor.ok) return actor;
  const res = await setAnnouncementArchived(actor.data.supabase, id, archived);
  if (res.ok) refresh();
  return res;
}

export async function pinAnnouncementAction(id: string, pinned: boolean): Promise<Result<null>> {
  if (!z.uuid().safeParse(id).success) return err('validation');
  const actor = await requireRole(['institution_admin']);
  if (!actor.ok) return actor;
  const res = await setAnnouncementPinned(actor.data.supabase, id, pinned);
  if (res.ok) refresh();
  return res;
}

export async function markAnnouncementsReadAction(ids: string[]): Promise<Result<null>> {
  if (!z.array(z.uuid()).max(200).safeParse(ids).success) return err('validation');
  const actor = await requireRole(['institution_admin', 'teacher', 'student']);
  if (!actor.ok) return actor;
  const res = await markAnnouncementsRead(actor.data.supabase, ids);
  if (!res.ok) return res;
  if (res.data.marked > 0) refresh();
  return { ok: true, data: null };
}
