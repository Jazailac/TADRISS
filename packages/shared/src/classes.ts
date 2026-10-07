import type { TadrissClient } from './client';
import { err, ok, toErrorCode, type Result } from './result';
import { sanitizeSearch } from './people';
import type { ClassInput, UpdateClassInput } from './schemas/classes';

export type ClassTeacher = { id: string; firstName: string; lastName: string };

export type ClassSummary = {
  id: string;
  name: string;
  level: string | null;
  schoolYear: string;
  capacity: number | null;
  /** Active enrolments only (history is kept but not counted). */
  enrolled: number;
  archived: boolean;
  teachers: ClassTeacher[];
};

type ClassRow = {
  id: string;
  name: string;
  level: string | null;
  school_year: string;
  capacity: number | null;
  deleted_at: string | null;
  enrolments: { count: number }[];
};

// `enrolments` has two composite FKs to `classes`, so the embed needs a hint.
const CLASS_COLUMNS =
  'id, name, level, school_year, capacity, deleted_at, enrolments!enrolments_class_id_institution_id_fkey(count)' as const;

async function withTeachers(
  client: TadrissClient,
  rows: ClassRow[],
): Promise<Result<ClassSummary[]>> {
  const ids = rows.map((r) => r.id);
  const byClass = new Map<string, ClassTeacher[]>();
  if (ids.length > 0) {
    const links = await client
      .from('class_teachers')
      .select('class_id, teacher_id')
      .in('class_id', ids);
    if (links.error) return err(toErrorCode(links.error));
    const teacherIds = [...new Set(links.data.map((l) => l.teacher_id))];
    const people =
      teacherIds.length > 0
        ? await client.from('profiles').select('id, first_name, last_name').in('id', teacherIds)
        : { data: [], error: null };
    if (people.error) return err(toErrorCode(people.error));
    const names = new Map(people.data.map((p) => [p.id, p]));
    for (const l of links.data) {
      const p = names.get(l.teacher_id);
      if (!p) continue; // a teacher the caller may not read: leave them out rather than fail
      byClass.set(l.class_id, [
        ...(byClass.get(l.class_id) ?? []),
        { id: p.id, firstName: p.first_name, lastName: p.last_name },
      ]);
    }
  }
  return ok(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      level: r.level,
      schoolYear: r.school_year,
      capacity: r.capacity,
      enrolled: r.enrolments[0]?.count ?? 0,
      archived: r.deleted_at !== null,
      teachers: (byClass.get(r.id) ?? []).sort((a, b) => a.lastName.localeCompare(b.lastName)),
    })),
  );
}

export type ListClassesOptions = { schoolYear: string; q?: string; archived?: boolean };

/** Classes the caller may see: all (admin), the ones they teach (teacher), their own (student). */
export async function listClasses(
  client: TadrissClient,
  opts: ListClassesOptions,
): Promise<Result<ClassSummary[]>> {
  let query = client
    .from('classes')
    .select(CLASS_COLUMNS)
    .eq('school_year', opts.schoolYear)
    // Count only active enrolments in the embedded aggregate.
    .eq('enrolments.status', 'active')
    .order('name', { ascending: true })
    .limit(300);
  query = opts.archived ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);
  const q = sanitizeSearch(opts.q ?? '');
  if (q) query = query.or(`name.ilike.%${q}%,level.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return err(toErrorCode(error));
  return withTeachers(client, data);
}

export async function getClass(client: TadrissClient, id: string): Promise<Result<ClassSummary>> {
  const { data, error } = await client
    .from('classes')
    .select(CLASS_COLUMNS)
    .eq('id', id)
    .eq('enrolments.status', 'active')
    .maybeSingle();
  if (error) return err(toErrorCode(error));
  if (!data) return err('not_found');
  const res = await withTeachers(client, [data]);
  if (!res.ok) return res;
  const first = res.data[0];
  return first ? ok(first) : err('not_found');
}

export async function createClass(
  client: TadrissClient,
  institutionId: string,
  input: ClassInput,
): Promise<Result<{ id: string }>> {
  const { data, error } = await client
    .from('classes')
    .insert({
      institution_id: institutionId,
      name: input.name,
      level: input.level,
      school_year: input.schoolYear,
      capacity: input.capacity,
    })
    .select('id')
    .single();
  if (error) return err(toErrorCode(error));
  return ok({ id: data.id });
}

export async function updateClass(
  client: TadrissClient,
  input: UpdateClassInput,
): Promise<Result<null>> {
  const { data, error } = await client
    .from('classes')
    .update({ name: input.name, level: input.level, capacity: input.capacity })
    .eq('id', input.id)
    .select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}

/** Archiving hides a class from teachers and students; nothing is deleted. */
export async function setClassArchived(
  client: TadrissClient,
  id: string,
  archived: boolean,
): Promise<Result<null>> {
  const { data, error } = await client
    .from('classes')
    .update({ deleted_at: archived ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}

export type RosterEntry = {
  enrolmentId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  enrolledOn: string;
};

/** Active students of a class, alphabetical. Teachers can read exactly these profiles. */
export async function listRoster(
  client: TadrissClient,
  classId: string,
): Promise<Result<RosterEntry[]>> {
  const enrolments = await client
    .from('enrolments')
    .select('id, student_id, enrolled_on')
    .eq('class_id', classId)
    .eq('status', 'active')
    .limit(500);
  if (enrolments.error) return err(toErrorCode(enrolments.error));
  const ids = enrolments.data.map((e) => e.student_id);
  if (ids.length === 0) return ok([]);

  const people = await client
    .from('profiles')
    .select('id, first_name, last_name, email')
    .in('id', ids);
  if (people.error) return err(toErrorCode(people.error));
  const byId = new Map(people.data.map((p) => [p.id, p]));

  return ok(
    enrolments.data
      .flatMap((e) => {
        const p = byId.get(e.student_id);
        return p
          ? [
              {
                enrolmentId: e.id,
                studentId: e.student_id,
                firstName: p.first_name,
                lastName: p.last_name,
                email: p.email,
                enrolledOn: e.enrolled_on,
              },
            ]
          : [];
      })
      .sort(
        (a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
      ),
  );
}

export type EnrolableStudent = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
};

export async function listEnrolableStudents(
  client: TadrissClient,
  opts: { schoolYear: string; q?: string; limit?: number },
): Promise<Result<EnrolableStudent[]>> {
  const { data, error } = await client.rpc('enrolable_students', {
    p_school_year: opts.schoolYear,
    p_query: sanitizeSearch(opts.q ?? ''),
    p_limit: opts.limit ?? 50,
  });
  if (error) return err(toErrorCode(error));
  return ok(
    data.map((s) => ({ id: s.id, firstName: s.first_name, lastName: s.last_name, email: s.email })),
  );
}

/** Enrols students in one transaction. `skipped` = already enrolled this year. */
export async function enrolStudents(
  client: TadrissClient,
  classId: string,
  studentIds: string[],
): Promise<Result<{ enrolled: number; skipped: number }>> {
  const unique = [...new Set(studentIds)];
  const { data, error } = await client.rpc('enrol_students', {
    p_class_id: classId,
    p_student_ids: unique,
  });
  if (error) return err(toErrorCode(error));
  return ok({ enrolled: data, skipped: unique.length - data });
}

/** Ends an enrolment today. History stays: the row is withdrawn, not deleted. */
export async function withdrawStudent(
  client: TadrissClient,
  enrolmentId: string,
  today: string = new Date().toISOString().slice(0, 10),
): Promise<Result<null>> {
  const { data, error } = await client
    .from('enrolments')
    .update({ status: 'withdrawn', withdrawn_on: today })
    .eq('id', enrolmentId)
    .eq('status', 'active')
    .select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}

/** Replaces the teachers of a class atomically. */
export async function setClassTeachers(
  client: TadrissClient,
  classId: string,
  teacherIds: string[],
): Promise<Result<null>> {
  const { error } = await client.rpc('set_class_teachers', {
    p_class_id: classId,
    p_teacher_ids: [...new Set(teacherIds)],
  });
  return error ? err(toErrorCode(error)) : ok(null);
}
