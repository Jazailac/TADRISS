import type { TadrissClient } from './client';
import { err, ok, toErrorCode, type Result } from './result';
import { currentSchoolYear } from './schemas/classes';

export const relationships = ['parent', 'mother', 'father', 'guardian'] as const;
export type Relationship = (typeof relationships)[number];

export type Child = {
  id: string;
  firstName: string;
  lastName: string;
  relationship: Relationship;
  /** Their active classes: one in a school, possibly several in a centre. */
  classIds: string[];
  /** Those classes' names, for display. Null when they have none. */
  className: string | null;
};

/**
 * The signed-in parent's children (RLS: only their own links). Each has their current classes, which
 * are what the timetable, homework and notices are scoped by.
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
      .eq('school_year', currentSchoolYear())
      .in('student_id', ids),
  ]);
  if (people.error) return err(toErrorCode(people.error));
  if (enrolments.error) return err(toErrorCode(enrolments.error));

  const names = new Map(people.data.map((p) => [p.id, p]));
  const classes = new Map<string, { id: string; name: string }[]>();
  for (const e of enrolments.data) {
    // RLS hides an archived class from a parent, but archiving leaves its enrolments active.
    const cls = e.class as { name: string } | null;
    if (!cls) continue;
    classes.set(e.student_id, [
      ...(classes.get(e.student_id) ?? []),
      { id: e.class_id, name: cls.name },
    ]);
  }
  return ok(
    data.flatMap((g) => {
      const p = names.get(g.student_id);
      if (!p) return [];
      const c = classes.get(g.student_id) ?? [];
      return [
        {
          id: g.student_id,
          firstName: p.first_name,
          lastName: p.last_name,
          relationship: g.relationship as Relationship,
          classIds: c.map((cls) => cls.id),
          className: c.length > 0 ? c.map((cls) => cls.name).join(' · ') : null,
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
