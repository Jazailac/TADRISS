import type { TadrissClient } from './client';
import { err, ok, toErrorCode, type Result } from './result';

export const relationships = ['parent', 'mother', 'father', 'guardian'] as const;
export type Relationship = (typeof relationships)[number];

export type Child = {
  id: string;
  firstName: string;
  lastName: string;
  relationship: Relationship;
  /** The class they are in this year, when they have one. */
  classId: string | null;
  className: string | null;
};

/**
 * The signed-in parent's children (RLS: only their own links). Each has their active class, which
 * is what the timetable, homework and notices are scoped by.
 */
export async function listChildren(client: TadrissClient): Promise<Result<Child[]>> {
  const { data, error } = await client
    .from('guardianships')
    .select('student_id, relationship')
    .order('created_at', { ascending: true });
  if (error) return err(toErrorCode(error));
  if (data.length === 0) return ok([]);
  const ids = data.map((g) => g.student_id);

  const [people, enrolments] = await Promise.all([
    client.from('profiles').select('id, first_name, last_name').in('id', ids),
    client
      .from('enrolments')
      .select('student_id, class_id, class:classes!enrolments_class_id_institution_id_fkey(name)')
      .eq('status', 'active')
      .in('student_id', ids),
  ]);
  if (people.error) return err(toErrorCode(people.error));
  if (enrolments.error) return err(toErrorCode(enrolments.error));

  const names = new Map(people.data.map((p) => [p.id, p]));
  const classes = new Map(
    enrolments.data.map((e) => [e.student_id, { id: e.class_id, name: e.class.name }]),
  );
  return ok(
    data.flatMap((g) => {
      const p = names.get(g.student_id);
      if (!p) return [];
      const c = classes.get(g.student_id);
      return [
        {
          id: g.student_id,
          firstName: p.first_name,
          lastName: p.last_name,
          relationship: g.relationship as Relationship,
          classId: c?.id ?? null,
          className: c?.name ?? null,
        },
      ];
    }),
  );
}

export type GuardianLink = {
  id: string;
  parentId: string;
  studentId: string;
  parentName: string;
  studentName: string;
  relationship: Relationship;
};

/** Every parent↔student link of the school (the administration's view), newest first. */
export async function listGuardianLinks(client: TadrissClient): Promise<Result<GuardianLink[]>> {
  const { data, error } = await client
    .from('guardianships')
    .select('id, parent_id, student_id, relationship')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) return err(toErrorCode(error));
  if (data.length === 0) return ok([]);
  const ids = [...new Set(data.flatMap((g) => [g.parent_id, g.student_id]))];
  const people = await client.from('profiles').select('id, first_name, last_name').in('id', ids);
  if (people.error) return err(toErrorCode(people.error));
  const names = new Map(people.data.map((p) => [p.id, `${p.first_name} ${p.last_name}`]));
  return ok(
    data.map((g) => ({
      id: g.id,
      parentId: g.parent_id,
      studentId: g.student_id,
      parentName: names.get(g.parent_id) ?? '',
      studentName: names.get(g.student_id) ?? '',
      relationship: g.relationship as Relationship,
    })),
  );
}

export async function linkGuardian(
  client: TadrissClient,
  institutionId: string,
  input: { parentId: string; studentId: string; relationship: Relationship },
): Promise<Result<null>> {
  const { error } = await client.from('guardianships').insert({
    institution_id: institutionId,
    parent_id: input.parentId,
    student_id: input.studentId,
    relationship: input.relationship,
  });
  return error ? err(toErrorCode(error)) : ok(null);
}

export async function unlinkGuardian(client: TadrissClient, id: string): Promise<Result<null>> {
  const { error, count } = await client
    .from('guardianships')
    .delete({ count: 'exact' })
    .eq('id', id);
  if (error) return err(toErrorCode(error));
  return count === 0 ? err('not_found') : ok(null);
}
