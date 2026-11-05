'use server';

import {
  err,
  plans,
  setInstitutionPlan,
  setInstitutionSuspended,
  type Plan,
  type Result,
} from '@tadriss/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePlatform } from '@/lib/require-admin';

const refresh = () => {
  revalidatePath('/[locale]', 'layout');
};

export async function setPlanAction(id: string, plan: Plan): Promise<Result<null>> {
  const parsed = z.object({ id: z.uuid(), plan: z.enum(plans) }).safeParse({ id, plan });
  if (!parsed.success) return err('validation');
  const actor = await requirePlatform();
  if (!actor.ok) return actor;
  const res = await setInstitutionPlan(actor.data.supabase, parsed.data.id, parsed.data.plan);
  if (res.ok) refresh();
  return res;
}

export async function setSuspendedAction(id: string, suspended: boolean): Promise<Result<null>> {
  if (!z.uuid().safeParse(id).success) return err('validation');
  const actor = await requirePlatform();
  if (!actor.ok) return actor;
  const res = await setInstitutionSuspended(actor.data.supabase, id, suspended);
  if (res.ok) refresh();
  return res;
}
