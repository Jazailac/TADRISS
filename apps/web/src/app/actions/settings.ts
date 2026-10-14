'use server';

import {
  err,
  fieldErrors,
  setModuleEnabled,
  settingsInput,
  updateInstitutionSettings,
  type ConfigurableRole,
  type Result,
} from '@tadriss/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { FormState } from '@/lib/form-state';
import { requireRole } from '@/lib/require-admin';

const FIELDS = ['name', 'defaultLocale', 'timezone', 'phone', 'address', 'city'];

const refresh = () => {
  revalidatePath('/[locale]', 'layout');
};

export async function updateSettingsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    FIELDS.map((n) => {
      const v = fd.get(n);
      return [n, typeof v === 'string' ? v : ''];
    }),
  );
  const parsed = settingsInput.safeParse(values);
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const actor = await requireRole(['institution_admin']);
  if (!actor.ok) return { error: actor.error, values };
  const res = await updateInstitutionSettings(
    actor.data.supabase,
    actor.data.institutionId,
    parsed.data,
  );
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true };
}

const accessInput = z.object({
  role: z.enum(['teacher', 'student']),
  module: z.string().min(1).max(40),
  enabled: z.boolean(),
});

export async function setModuleEnabledAction(
  role: ConfigurableRole,
  module: string,
  enabled: boolean,
): Promise<Result<null>> {
  const parsed = accessInput.safeParse({ role, module, enabled });
  if (!parsed.success) return err('validation');
  const actor = await requireRole(['institution_admin']);
  if (!actor.ok) return actor;
  const res = await setModuleEnabled(actor.data.supabase, actor.data.institutionId, parsed.data);
  if (res.ok) refresh();
  return res;
}
