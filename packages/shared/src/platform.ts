import type { TadrissClient } from './client';
import { err, ok, toErrorCode, type Result } from './result';
import type { Plan } from './settings';

export const plans = ['essential', 'standard', 'premium'] as const;

export type PlatformInstitution = {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  defaultLocale: string;
  suspended: boolean;
  /** ISO timestamp. */
  createdAt: string;
  students: number;
  teachers: number;
  admins: number;
};

/** Every school with its active head-count. Empty for anyone but the platform operator. */
export async function listPlatformInstitutions(
  client: TadrissClient,
): Promise<Result<PlatformInstitution[]>> {
  const { data, error } = await client.rpc('platform_institutions');
  if (error) return err(toErrorCode(error));
  return ok(
    data.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      plan: r.plan as Plan,
      defaultLocale: r.default_locale,
      suspended: r.suspended,
      createdAt: r.created_at,
      students: r.students,
      teachers: r.teachers,
      admins: r.admins,
    })),
  );
}

export async function getPlatformInstitution(
  client: TadrissClient,
  id: string,
): Promise<Result<PlatformInstitution>> {
  const all = await listPlatformInstitutions(client);
  if (!all.ok) return all;
  const found = all.data.find((i) => i.id === id);
  return found ? ok(found) : err('not_found');
}

export async function setInstitutionPlan(
  client: TadrissClient,
  id: string,
  plan: Plan,
): Promise<Result<null>> {
  const { error, count } = await client
    .from('institutions')
    .update({ plan }, { count: 'exact' })
    .eq('id', id);
  if (error) return err(toErrorCode(error));
  return count === 0 ? err('not_found') : ok(null);
}

/** Suspend (soft delete) or restore a school. Its members lose access at their next token refresh. */
export async function setInstitutionSuspended(
  client: TadrissClient,
  id: string,
  suspended: boolean,
): Promise<Result<null>> {
  const { error, count } = await client
    .from('institutions')
    .update({ deleted_at: suspended ? new Date().toISOString() : null }, { count: 'exact' })
    .eq('id', id);
  if (error) return err(toErrorCode(error));
  return count === 0 ? err('not_found') : ok(null);
}

export type AuditEntry = {
  id: string;
  institutionId: string | null;
  institutionName: string | null;
  actorId: string | null;
  actorName: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown>;
  /** ISO timestamp. */
  createdAt: string;
};

/**
 * Newest events first. RLS decides the scope: a school's administrator gets their school's log, the
 * platform operator every school's. `before` is a `createdAt` cursor for the next page.
 */
export async function listAuditLog(
  client: TadrissClient,
  opts: { institutionId?: string; before?: string; limit?: number } = {},
): Promise<Result<AuditEntry[]>> {
  let query = client
    .from('audit_log')
    .select('id, institution_id, actor_id, action, entity, entity_id, details, created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.institutionId) query = query.eq('institution_id', opts.institutionId);
  if (opts.before) query = query.lt('created_at', opts.before);
  const { data, error } = await query;
  if (error) return err(toErrorCode(error));
  if (data.length === 0) return ok([]);

  const actorIds = [...new Set(data.flatMap((r) => (r.actor_id ? [r.actor_id] : [])))];
  const schoolIds = [...new Set(data.flatMap((r) => (r.institution_id ? [r.institution_id] : [])))];
  const [people, schools] = await Promise.all([
    actorIds.length > 0
      ? client.from('profiles').select('id, first_name, last_name').in('id', actorIds)
      : Promise.resolve({ data: [], error: null }),
    schoolIds.length > 0
      ? client.from('institutions').select('id, name').in('id', schoolIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (people.error) return err(toErrorCode(people.error));
  if (schools.error) return err(toErrorCode(schools.error));
  const names = new Map(people.data.map((p) => [p.id, `${p.first_name} ${p.last_name}`]));
  const schoolNames = new Map(schools.data.map((s) => [s.id, s.name]));

  return ok(
    data.map((r) => ({
      id: r.id,
      institutionId: r.institution_id,
      institutionName: r.institution_id ? (schoolNames.get(r.institution_id) ?? null) : null,
      actorId: r.actor_id,
      actorName: r.actor_id ? (names.get(r.actor_id) ?? '') : '',
      action: r.action,
      entity: r.entity,
      entityId: r.entity_id,
      // jsonb: an object for every row our triggers write, but typed as any JSON value.
      details: Array.isArray(r.details) ? {} : (r.details as Record<string, unknown>),
      createdAt: r.created_at,
    })),
  );
}
