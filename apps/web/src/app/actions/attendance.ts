'use server';

import { err, submitAttendance, submitAttendanceInput, type Result } from '@tadriss/shared';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-admin';

/**
 * Saves a roll call. The input is typed data from the roll-call screen (not a FormData), so it is
 * validated here with the shared schema; the RPC then enforces ownership, dates and the roster.
 */
export async function submitAttendanceAction(
  input: unknown,
): Promise<Result<{ sessionId: string }>> {
  const parsed = submitAttendanceInput.safeParse(input);
  if (!parsed.success) return err('validation');

  const actor = await requireRole(['teacher', 'institution_admin']);
  if (!actor.ok) return actor;
  const res = await submitAttendance(actor.data.supabase, parsed.data);
  if (res.ok) {
    revalidatePath('/[locale]/teacher/attendance', 'page');
    revalidatePath('/[locale]/teacher/attendance/[slotId]', 'page');
    revalidatePath('/[locale]/dashboard/attendance', 'page');
    revalidatePath('/[locale]/dashboard/attendance/[slotId]', 'page');
    revalidatePath('/[locale]/student/attendance', 'page');
  }
  return res;
}
