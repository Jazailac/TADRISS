'use server';

import {
  err,
  fieldErrors,
  markThreadRead,
  messageInput,
  sendMessage,
  type Result,
} from '@tadriss/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { FormState } from '@/lib/form-state';
import { requireRole } from '@/lib/require-admin';

const refresh = () => {
  revalidatePath('/[locale]', 'layout');
};

/** Used by both the "new message" dialog and the thread composer (`useActionState`). */
export async function sendMessageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const recipient = fd.get('recipientId');
  const text = fd.get('body');
  const values = {
    recipientId: typeof recipient === 'string' ? recipient : '',
    body: typeof text === 'string' ? text : '',
  };
  const parsed = messageInput.safeParse(values);
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const actor = await requireRole(['institution_admin', 'teacher', 'student']);
  if (!actor.ok) return { error: actor.error, values };
  const res = await sendMessage(actor.data.supabase, actor.data.institutionId, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  // The text is NOT echoed back on success: the composer clears itself.
  return { done: true, values: { recipientId: parsed.data.recipientId } };
}

export async function markThreadReadAction(otherId: string): Promise<Result<null>> {
  if (!z.uuid().safeParse(otherId).success) return err('validation');
  const actor = await requireRole(['institution_admin', 'teacher', 'student']);
  if (!actor.ok) return actor;
  const res = await markThreadRead(actor.data.supabase, otherId);
  if (res.ok) refresh();
  return res;
}
