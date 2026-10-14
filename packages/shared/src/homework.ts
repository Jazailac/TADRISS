import type { TadrissClient } from './client';
import { listRoster } from './classes';
import { err, ok, toErrorCode, type Result } from './result';
import type { HomeworkInput, UpdateHomeworkInput } from './schemas/homework';
import type { SubjectColor } from './schemas/schedule';

export type HomeworkView = {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectColor: SubjectColor;
  teacherId: string;
  teacherName: string;
  title: string;
  description: string | null;
  /** `YYYY-MM-DD`. */
  dueDate: string;
  archived: boolean;
  /**
   * For a student: whether they have ticked it off. For a teacher: how many students have (only
   * homework they set is counted, because that is all RLS lets them see).
   */
  doneCount: number;
};

// One literal (not concatenated) so the typed query builder can infer the embedded rows.
const HOMEWORK_COLUMNS =
  'id, class_id, subject_id, teacher_id, title, description, due_date, deleted_at, class:classes!homework_class_id_institution_id_fkey(name), subject:subjects!homework_subject_id_institution_id_fkey(name, color), completions:homework_completions!homework_completions_homework_id_institution_id_fkey(student_id)' as const;

type Row = {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  due_date: string;
  deleted_at: string | null;
  class: unknown;
  subject: unknown;
  completions: { student_id: string }[];
};

async function toViews(
  client: TadrissClient,
  rows: Row[],
  studentId?: string,
): Promise<Result<HomeworkView[]>> {
  const teacherIds = [...new Set(rows.map((r) => r.teacher_id))];
  const people =
    teacherIds.length > 0
      ? await client.from('profiles').select('id, first_name, last_name').in('id', teacherIds)
      : { data: [], error: null };
  if (people.error) return err(toErrorCode(people.error));
  const names = new Map(people.data.map((p) => [p.id, `${p.first_name} ${p.last_name}`]));

  return ok(
    rows.flatMap((r) => {
      // Typed non-null by the generator, but RLS can hide an archived class or subject.
      const cls = r.class as { name: string } | null;
      const subject = r.subject as { name: string; color: string } | null;
      return cls && subject
        ? [
            {
              id: r.id,
              classId: r.class_id,
              className: cls.name,
              subjectId: r.subject_id,
              subjectName: subject.name,
              subjectColor: subject.color as SubjectColor,
              teacherId: r.teacher_id,
              teacherName: names.get(r.teacher_id) ?? '',
              title: r.title,
              description: r.description,
              dueDate: r.due_date,
              archived: r.deleted_at !== null,
              // For one named student (a parent looking at one child) count only their tick.
              doneCount: studentId
                ? r.completions.filter((c) => c.student_id === studentId).length
                : r.completions.length,
            },
          ]
        : [];
    }),
  );
}

/**
 * Homework the caller may see (RLS decides: their classes). Soft-deleted homework is left out
 * unless `archived` is requested (a teacher's own deleted homework, for restoring).
 */
export async function listHomework(
  client: TadrissClient,
  opts: { teacherId?: string; classId?: string; archived?: boolean; studentId?: string } = {},
): Promise<Result<HomeworkView[]>> {
  let query = client
    .from('homework')
    .select(HOMEWORK_COLUMNS)
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(500);
  query = opts.archived ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);
  if (opts.teacherId) query = query.eq('teacher_id', opts.teacherId);
  if (opts.classId) query = query.eq('class_id', opts.classId);
  const { data, error } = await query;
  if (error) return err(toErrorCode(error));
  return toViews(client, data, opts.studentId);
}

export async function getHomework(
  client: TadrissClient,
  id: string,
): Promise<Result<HomeworkView>> {
  const { data, error } = await client
    .from('homework')
    .select(HOMEWORK_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) return err(toErrorCode(error));
  if (!data) return err('not_found');
  const views = await toViews(client, [data]);
  if (!views.ok) return views;
  const first = views.data[0];
  return first ? ok(first) : err('not_found');
}

export type HomeworkProgressEntry = {
  studentId: string;
  firstName: string;
  lastName: string;
  done: boolean;
};

/** Every student of the class, and whether they have finished (the teacher's view). */
export async function getHomeworkProgress(
  client: TadrissClient,
  homeworkId: string,
  classId: string,
): Promise<Result<HomeworkProgressEntry[]>> {
  const [roster, done] = await Promise.all([
    listRoster(client, classId),
    client.from('homework_completions').select('student_id').eq('homework_id', homeworkId),
  ]);
  if (!roster.ok) return roster;
  if (done.error) return err(toErrorCode(done.error));
  const finished = new Set(done.data.map((d) => d.student_id));
  return ok(
    roster.data.map((s) => ({
      studentId: s.studentId,
      firstName: s.firstName,
      lastName: s.lastName,
      done: finished.has(s.studentId),
    })),
  );
}

export async function createHomework(
  client: TadrissClient,
  institutionId: string,
  input: HomeworkInput,
): Promise<Result<{ id: string }>> {
  const { data, error } = await client
    .from('homework')
    .insert({
      institution_id: institutionId,
      class_id: input.classId,
      subject_id: input.subjectId,
      title: input.title,
      description: input.description,
      due_date: input.dueDate,
    })
    .select('id')
    .single();
  if (error) return err(toErrorCode(error));
  return ok({ id: data.id });
}

export async function updateHomework(
  client: TadrissClient,
  input: UpdateHomeworkInput,
): Promise<Result<null>> {
  const { data, error } = await client
    .from('homework')
    .update({
      subject_id: input.subjectId,
      title: input.title,
      description: input.description,
      due_date: input.dueDate,
    })
    .eq('id', input.id)
    .select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}

/** Soft delete / restore. Uses a count, not `.select()`: a deleted row is no longer returned. */
export async function setHomeworkArchived(
  client: TadrissClient,
  id: string,
  archived: boolean,
): Promise<Result<null>> {
  const { count, error } = await client
    .from('homework')
    .update({ deleted_at: archived ? new Date().toISOString() : null }, { count: 'exact' })
    .eq('id', id);
  if (error) return err(toErrorCode(error));
  return (count ?? 0) > 0 ? ok(null) : err('not_found');
}

/** A student ticks homework off (`done`) or un-ticks it. Idempotent either way. */
export async function setHomeworkDone(
  client: TadrissClient,
  opts: { institutionId: string; studentId: string; homeworkId: string; done: boolean },
): Promise<Result<null>> {
  if (opts.done) {
    const { error } = await client.from('homework_completions').upsert(
      {
        institution_id: opts.institutionId,
        homework_id: opts.homeworkId,
        student_id: opts.studentId,
      },
      { onConflict: 'homework_id,student_id', ignoreDuplicates: true },
    );
    return error ? err(toErrorCode(error)) : ok(null);
  }
  const { error } = await client
    .from('homework_completions')
    .delete()
    .eq('homework_id', opts.homeworkId)
    .eq('student_id', opts.studentId);
  return error ? err(toErrorCode(error)) : ok(null);
}

export type HomeworkBucket = 'overdue' | 'upcoming' | 'done';

/**
 * Where a student's homework belongs today: finished work is "done" whatever its date; otherwise it
 * is "overdue" once its due date has passed, else "upcoming". Dates compare as ISO strings.
 */
export function homeworkBucket(
  hw: { dueDate: string; doneCount: number },
  today: string,
): HomeworkBucket {
  if (hw.doneCount > 0) return 'done';
  return hw.dueDate < today ? 'overdue' : 'upcoming';
}
