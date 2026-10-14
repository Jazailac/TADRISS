'use server';

import { err, linkGuardian, relationships, unlinkGuardian, type Result } from '@tadriss/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/require-admin';

const refresh = () => {
  revalidatePath('/[locale]', 'layout');
};

const linkInput = z.object({
  parentId: z.uuid(),
  studentId: z.uuid(),
  relationship: z.enum(relationships),
});

export async function linkGuardianAction(
  parentId: string,
  studentId: string,
  relationship: string,
): Promise<Result<null>> {
  const parsed = linkInput.safeParse({ parentId, studentId, relationship });
  if (!parsed.success) return err('validation');
  const admin = await requireAdmin();
  if (!admin.ok) return admin;
  const res = await linkGuardian(admin.data.supabase, admin.data.institutionId, parsed.data);
  if (res.ok) refresh();
  return res;
}

export async function unlinkGuardianAction(id: string): Promise<Result<null>> {
  if (!z.uuid().safeParse(id).success) return err('validation');
  const admin = await requireAdmin();
  if (!admin.ok) return admin;
  const res = await unlinkGuardian(admin.data.supabase, id);
  if (res.ok) refresh();
  return res;
}
