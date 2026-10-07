'use server';

import {
  createSlot,
  createSubject,
  deleteSlot,
  err,
  fieldErrors,
  setSubjectArchived,
  slotInput,
  subjectInput,
  updateSlot,
  updateSlotInput,
  updateSubject,
  updateSubjectInput,
  type Result,
} from '@tadriss/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { FormState } from '@/lib/form-state';
import { requireAdmin } from '@/lib/require-admin';

const echo = (fd: FormData, names: string[]) =>
  Object.fromEntries(
    names.map((n) => {
      const v = fd.get(n);
      return [n, typeof v === 'string' ? v : ''];
    }),
  );

const refresh = () => {
  revalidatePath('/[locale]/dashboard/schedule', 'page');
  revalidatePath('/[locale]/teacher/schedule', 'page');
  revalidatePath('/[locale]/student/schedule', 'page');
};

const SLOT_FIELDS = ['subjectId', 'teacherId', 'weekday', 'start', 'end', 'room'];

export async function createSlotAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd, SLOT_FIELDS);
  const parsed = slotInput.safeParse({
    classId: fd.get('classId'),
    subjectId: fd.get('subjectId'),
    teacherId: fd.get('teacherId'),
    weekday: fd.get('weekday'),
    start: fd.get('start'),
    end: fd.get('end'),
    room: fd.get('room'),
  });
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error, values };
  const res = await createSlot(auth.data.supabase, auth.data.institutionId, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true };
}

export async function updateSlotAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd, SLOT_FIELDS);
  const parsed = updateSlotInput.safeParse({
    id: fd.get('id'),
    subjectId: fd.get('subjectId'),
    teacherId: fd.get('teacherId'),
    weekday: fd.get('weekday'),
    start: fd.get('start'),
    end: fd.get('end'),
    room: fd.get('room'),
  });
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error, values };
  const res = await updateSlot(auth.data.supabase, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true };
}

export async function deleteSlotAction(id: string): Promise<Result<null>> {
  if (!z.uuid().safeParse(id).success) return err('validation');
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const res = await deleteSlot(auth.data.supabase, id);
  if (res.ok) refresh();
  return res;
}

export async function createSubjectAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd, ['name', 'color']);
  const parsed = subjectInput.safeParse({ name: fd.get('name'), color: fd.get('color') });
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error, values };
  const res = await createSubject(auth.data.supabase, auth.data.institutionId, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true };
}

export async function updateSubjectAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd, ['name', 'color']);
  const parsed = updateSubjectInput.safeParse({
    id: fd.get('id'),
    name: fd.get('name'),
    color: fd.get('color'),
  });
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error, values };
  const res = await updateSubject(auth.data.supabase, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true };
}

export async function archiveSubjectAction(id: string, archived: boolean): Promise<Result<null>> {
  if (!z.uuid().safeParse(id).success) return err('validation');
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const res = await setSubjectArchived(auth.data.supabase, id, archived);
  if (res.ok) refresh();
  return res;
}
