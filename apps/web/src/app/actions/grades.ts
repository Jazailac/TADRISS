'use server';

import {
  createExam,
  err,
  examInput,
  fieldErrors,
  saveGrades,
  saveGradesInput,
  setExamArchived,
  setExamPublished,
  updateExam,
  updateExamInput,
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

const refresh = () => {
  revalidatePath('/[locale]/teacher/grades', 'page');
  revalidatePath('/[locale]/teacher/grades/[id]', 'page');
  revalidatePath('/[locale]/dashboard/grades', 'page');
  revalidatePath('/[locale]/dashboard/grades/[id]', 'page');
  revalidatePath('/[locale]/student/grades', 'page');
};

const FIELDS = ['classId', 'subjectId', 'title', 'examDate', 'maxScore', 'coefficient', 'term'];

export async function createExamAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd, FIELDS);
  const parsed = examInput.safeParse(Object.fromEntries(FIELDS.map((f) => [f, fd.get(f)])));
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const actor = await requireRole(['teacher']);
  if (!actor.ok) return { error: actor.error, values };
  const res = await createExam(actor.data.supabase, actor.data.institutionId, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true, values: { id: res.data.id } };
}

export async function updateExamAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd, FIELDS);
  const parsed = updateExamInput.safeParse({
    id: fd.get('id'),
    ...Object.fromEntries(FIELDS.filter((f) => f !== 'classId').map((f) => [f, fd.get(f)])),
  });
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const actor = await requireRole(['teacher']);
  if (!actor.ok) return { error: actor.error, values };
  const res = await updateExam(actor.data.supabase, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true };
}

export async function publishExamAction(id: string, published: boolean): Promise<Result<null>> {
  if (!z.uuid().safeParse(id).success) return err('validation');
  const actor = await requireRole(['teacher']);
  if (!actor.ok) return actor;
  const res = await setExamPublished(actor.data.supabase, id, published);
  if (res.ok) refresh();
  return res;
}

export async function archiveExamAction(id: string, archived: boolean): Promise<Result<null>> {
  if (!z.uuid().safeParse(id).success) return err('validation');
  const actor = await requireRole(['teacher']);
  if (!actor.ok) return actor;
  const res = await setExamArchived(actor.data.supabase, id, archived);
  if (res.ok) refresh();
  return res;
}

/** Saves a whole mark sheet. Typed data from the sheet (not a FormData): validated here, then by the RPC. */
export async function saveGradesAction(input: unknown): Promise<Result<{ written: number }>> {
  const parsed = saveGradesInput.safeParse(input);
  if (!parsed.success) return err('validation');
  const actor = await requireRole(['teacher']);
  if (!actor.ok) return actor;
  const res = await saveGrades(actor.data.supabase, parsed.data);
  if (res.ok) refresh();
  return res;
}
