'use server';

import {
  createHomework,
  err,
  fieldErrors,
  homeworkInput,
  setHomeworkArchived,
  setHomeworkDone,
  updateHomework,
  updateHomeworkInput,
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
  revalidatePath('/[locale]/teacher/homework', 'page');
  revalidatePath('/[locale]/teacher/homework/[id]', 'page');
  revalidatePath('/[locale]/student/homework', 'page');
};

const FIELDS = ['classId', 'subjectId', 'title', 'description', 'dueDate'];

export async function createHomeworkAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd, FIELDS);
  const parsed = homeworkInput.safeParse({
    classId: fd.get('classId'),
    subjectId: fd.get('subjectId'),
    title: fd.get('title'),
    description: fd.get('description'),
    dueDate: fd.get('dueDate'),
  });
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const actor = await requireRole(['teacher']);
  if (!actor.ok) return { error: actor.error, values };
  const res = await createHomework(actor.data.supabase, actor.data.institutionId, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true, values: { id: res.data.id } };
}

export async function updateHomeworkAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd, FIELDS);
  const parsed = updateHomeworkInput.safeParse({
    id: fd.get('id'),
    subjectId: fd.get('subjectId'),
    title: fd.get('title'),
    description: fd.get('description'),
    dueDate: fd.get('dueDate'),
  });
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const actor = await requireRole(['teacher']);
  if (!actor.ok) return { error: actor.error, values };
  const res = await updateHomework(actor.data.supabase, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true };
}

export async function archiveHomeworkAction(id: string, archived: boolean): Promise<Result<null>> {
  if (!z.uuid().safeParse(id).success) return err('validation');
  const actor = await requireRole(['teacher']);
  if (!actor.ok) return actor;
  const res = await setHomeworkArchived(actor.data.supabase, id, archived);
  if (res.ok) refresh();
  return res;
}

export async function toggleHomeworkDoneAction(
  homeworkId: string,
  done: boolean,
): Promise<Result<null>> {
  if (!z.uuid().safeParse(homeworkId).success) return err('validation');
  const actor = await requireRole(['student']);
  if (!actor.ok) return actor;
  const res = await setHomeworkDone(actor.data.supabase, {
    institutionId: actor.data.institutionId,
    studentId: actor.data.userId,
    homeworkId,
    done,
  });
  if (res.ok) refresh();
  return res;
}
