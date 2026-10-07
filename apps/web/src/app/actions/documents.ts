'use server';

import {
  documentInput,
  err,
  fieldErrors,
  setDocumentArchived,
  updateDocument,
  updateDocumentInput,
  uploadDocument,
  validateDocumentFile,
  type Result,
} from '@tadriss/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { FormState } from '@/lib/form-state';
import { requireRole } from '@/lib/require-admin';

const text = (fd: FormData, name: string) => {
  const v = fd.get(name);
  return typeof v === 'string' ? v : '';
};

const refresh = () => {
  revalidatePath('/[locale]', 'layout');
};

/** The file arrives in the same FormData as the text fields (Server Actions accept `File`s). */
export async function uploadDocumentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = {
    audience: text(fd, 'audience'),
    title: text(fd, 'title'),
    description: text(fd, 'description'),
  };
  const file = fd.get('file');
  const parsed = documentInput.safeParse(values);
  const fields: NonNullable<FormState>['fields'] = parsed.success ? {} : fieldErrors(parsed.error);
  const fileProblem = file instanceof File ? validateDocumentFile(file) : ('fileRequired' as const);
  if (fileProblem) fields.file = fileProblem;
  if (!parsed.success || fileProblem || !(file instanceof File))
    return { error: 'validation', fields, values };

  const actor = await requireRole(['institution_admin', 'teacher']);
  if (!actor.ok) return { error: actor.error, values };
  const res = await uploadDocument(
    actor.data.supabase,
    actor.data.institutionId,
    { body: file, name: file.name, size: file.size, type: file.type },
    parsed.data,
  );
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true, values: { id: res.data.id } };
}

export async function updateDocumentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = { title: text(fd, 'title'), description: text(fd, 'description') };
  const parsed = updateDocumentInput.safeParse({ id: fd.get('id'), ...values });
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const actor = await requireRole(['institution_admin', 'teacher']);
  if (!actor.ok) return { error: actor.error, values };
  const res = await updateDocument(actor.data.supabase, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true };
}

export async function archiveDocumentAction(id: string, archived: boolean): Promise<Result<null>> {
  if (!z.uuid().safeParse(id).success) return err('validation');
  const actor = await requireRole(['institution_admin', 'teacher']);
  if (!actor.ok) return actor;
  const res = await setDocumentArchived(actor.data.supabase, id, archived);
  if (res.ok) refresh();
  return res;
}
