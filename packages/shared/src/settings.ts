import type { TadrissClient } from './client';
import type { Locale } from './locale';
import { err, ok, toErrorCode, type Result } from './result';
import {
  roleModules,
  type ConfigurableRole,
  type ModuleKey,
  type SettingsInput,
} from './schemas/settings';

export type Plan = 'essential' | 'standard' | 'premium';

export type InstitutionSettings = {
  id: string;
  name: string;
  slug: string;
  defaultLocale: Locale;
  timezone: string;
  plan: Plan;
  phone: string | null;
  address: string | null;
  city: string | null;
};

/** The caller's own school (RLS shows nothing else to a school member). */
export async function getInstitutionSettings(
  client: TadrissClient,
  institutionId: string,
): Promise<Result<InstitutionSettings>> {
  const { data, error } = await client
    .from('institutions')
    .select('id, name, slug, default_locale, timezone, plan, phone, address, city')
    .eq('id', institutionId)
    .maybeSingle();
  if (error) return err(toErrorCode(error));
  if (!data) return err('not_found');
  return ok({
    id: data.id,
    name: data.name,
    slug: data.slug,
    defaultLocale: data.default_locale as Locale,
    timezone: data.timezone,
    plan: data.plan as Plan,
    phone: data.phone,
    address: data.address,
    city: data.city,
  });
}

export async function updateInstitutionSettings(
  client: TadrissClient,
  institutionId: string,
  input: SettingsInput,
): Promise<Result<null>> {
  const { error, count } = await client
    .from('institutions')
    .update(
      {
        name: input.name,
        default_locale: input.defaultLocale,
        timezone: input.timezone,
        phone: input.phone,
        address: input.address,
        city: input.city,
      },
      { count: 'exact' },
    )
    .eq('id', institutionId);
  if (error) return err(toErrorCode(error));
  return count === 0 ? err('not_found') : ok(null);
}

export type PlanUsage = {
  plan: Plan;
  students: { used: number; limit: number | null };
  teachers: { used: number; limit: number | null };
};

export async function getPlanUsage(client: TadrissClient): Promise<Result<PlanUsage>> {
  const { data, error } = await client.rpc('plan_usage');
  if (error) return err(toErrorCode(error));
  const row = data[0];
  if (!row) return err('forbidden');
  return ok({
    plan: row.plan as Plan,
    students: { used: row.students_used, limit: row.students_limit },
    teachers: { used: row.teachers_used, limit: row.teachers_limit },
  });
}

/** Modules switched OFF for a role. Anything without a row is on. */
export async function listDisabledModules(
  client: TadrissClient,
  role: ConfigurableRole,
): Promise<Result<ModuleKey[]>> {
  const { data, error } = await client
    .from('module_access')
    .select('module')
    .eq('role', role)
    .eq('enabled', false);
  if (error) return err(toErrorCode(error));
  const known: readonly string[] = roleModules[role];
  return ok(data.map((d) => d.module).filter((m): m is ModuleKey => known.includes(m)));
}

export async function setModuleEnabled(
  client: TadrissClient,
  institutionId: string,
  input: { role: ConfigurableRole; module: string; enabled: boolean },
): Promise<Result<null>> {
  const known: readonly string[] = roleModules[input.role];
  if (!known.includes(input.module)) return err('validation');
  const { error } = await client.from('module_access').upsert(
    {
      institution_id: institutionId,
      role: input.role,
      module: input.module,
      enabled: input.enabled,
    },
    { onConflict: 'institution_id,role,module' },
  );
  return error ? err(toErrorCode(error)) : ok(null);
}
