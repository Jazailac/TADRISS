import type { TadrissClient } from './client';
import { listRoster } from './classes';
import { err, ok, toErrorCode, type Result } from './result';
import type { ExamInput, SaveGradesInput, UpdateExamInput } from './schemas/grades';
import type { SubjectColor } from './schemas/schedule';

export type ExamStats = {
  graded: number;
  absent: number;
  avg20: number | null;
  min20: number | null;
  max20: number | null;
};

export type ExamView = {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectColor: SubjectColor;
  teacherId: string;
  teacherName: string;
  title: string;
  /** `YYYY-MM-DD`. */
  examDate: string;
  maxScore: number;
  coefficient: number;
  term: 1 | 2;
  published: boolean;
  archived: boolean;
  stats: ExamStats | null;
};

// One literal (not concatenated) so the typed query builder can infer the embedded rows.
const EXAM_COLUMNS =
  'id, class_id, subject_id, teacher_id, title, exam_date, max_score, coefficient, term, published_at, deleted_at, class:classes!exams_class_id_institution_id_fkey(name), subject:subjects!exams_subject_id_institution_id_fkey(name, color)' as const;

type ExamRow = {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  exam_date: string;
  max_score: number;
  coefficient: number;
  term: number;
  published_at: string | null;
  deleted_at: string | null;
  class: unknown;
  subject: unknown;
};

async function toViews(
  client: TadrissClient,
  rows: ExamRow[],
  withStats: boolean,
): Promise<Result<ExamView[]>> {
  const teacherIds = [...new Set(rows.map((r) => r.teacher_id))];
  const [people, summary] = await Promise.all([
    teacherIds.length > 0
      ? client.from('profiles').select('id, first_name, last_name').in('id', teacherIds)
      : Promise.resolve({ data: [], error: null }),
    withStats ? client.rpc('exam_summary', {}) : Promise.resolve({ data: [], error: null }),
  ]);
  if (people.error) return err(toErrorCode(people.error));
  if (summary.error) return err(toErrorCode(summary.error));

  const names = new Map(people.data.map((p) => [p.id, `${p.first_name} ${p.last_name}`]));
  const stats = new Map(summary.data.map((s) => [s.exam_id, s]));

  return ok(
    rows.flatMap((r) => {
      const cls = r.class as { name: string } | null;
      const subject = r.subject as { name: string; color: string } | null;
      if (!cls || !subject) return [];
      const s = stats.get(r.id);
      return [
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
          examDate: r.exam_date,
          maxScore: r.max_score,
          coefficient: r.coefficient,
          term: r.term === 2 ? 2 : 1,
          published: r.published_at !== null,
          archived: r.deleted_at !== null,
          stats: s
            ? {
                graded: s.graded,
                absent: s.absent,
                // RPC return types don't express nullability: no marks means null.
                avg20: s.avg20,
                min20: s.min20,
                max20: s.max20,
              }
            : null,
        },
      ];
    }),
  );
}

/** Exams the caller may see (RLS), newest first, with 0-20 statistics. */
export async function listExams(
  client: TadrissClient,
  opts: { teacherId?: string; classId?: string; term?: 1 | 2; archived?: boolean } = {},
): Promise<Result<ExamView[]>> {
  let query = client
    .from('exams')
    .select(EXAM_COLUMNS)
    .order('exam_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);
  query = opts.archived ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);
  if (opts.teacherId) query = query.eq('teacher_id', opts.teacherId);
  if (opts.classId) query = query.eq('class_id', opts.classId);
  if (opts.term) query = query.eq('term', opts.term);
  const { data, error } = await query;
  if (error) return err(toErrorCode(error));
  return toViews(client, data, true);
}

export async function getExam(client: TadrissClient, id: string): Promise<Result<ExamView>> {
  const { data, error } = await client
    .from('exams')
    .select(EXAM_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) return err(toErrorCode(error));
  if (!data) return err('not_found');
  const views = await toViews(client, [data], true);
  if (!views.ok) return views;
  const first = views.data.find((v) => v.id === id);
  return first ? ok(first) : err('not_found');
}

export type MarkSheetRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  score: number | null;
  absent: boolean;
  remark: string | null;
};

/** Every student of the class with their mark (if any): the grade-entry sheet. */
export async function getMarkSheet(
  client: TadrissClient,
  examId: string,
  classId: string,
): Promise<Result<MarkSheetRow[]>> {
  const [roster, grades] = await Promise.all([
    listRoster(client, classId),
    client.from('grades').select('student_id, score, absent, remark').eq('exam_id', examId),
  ]);
  if (!roster.ok) return roster;
  if (grades.error) return err(toErrorCode(grades.error));
  const byStudent = new Map(grades.data.map((g) => [g.student_id, g]));
  return ok(
    roster.data.map((s) => {
      const g = byStudent.get(s.studentId);
      return {
        studentId: s.studentId,
        firstName: s.firstName,
        lastName: s.lastName,
        score: g?.score ?? null,
        absent: g?.absent ?? false,
        remark: g?.remark ?? null,
      };
    }),
  );
}

export async function createExam(
  client: TadrissClient,
  institutionId: string,
  input: ExamInput,
): Promise<Result<{ id: string }>> {
  const { data, error } = await client
    .from('exams')
    .insert({
      institution_id: institutionId,
      class_id: input.classId,
      subject_id: input.subjectId,
      title: input.title,
      exam_date: input.examDate,
      max_score: input.maxScore,
      coefficient: input.coefficient,
      term: input.term,
    })
    .select('id')
    .single();
  if (error) return err(toErrorCode(error));
  return ok({ id: data.id });
}

export async function updateExam(
  client: TadrissClient,
  input: UpdateExamInput,
): Promise<Result<null>> {
  const { data, error } = await client
    .from('exams')
    .update({
      subject_id: input.subjectId,
      title: input.title,
      exam_date: input.examDate,
      max_score: input.maxScore,
      coefficient: input.coefficient,
      term: input.term,
    })
    .eq('id', input.id)
    .select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}

/** Publishing makes the exam and each student's own mark visible to that student. */
export async function setExamPublished(
  client: TadrissClient,
  id: string,
  published: boolean,
): Promise<Result<null>> {
  const { data, error } = await client
    .from('exams')
    .update({ published_at: published ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}

/** Soft delete / restore. A count, not `.select()`: a deleted row is no longer returned (see 0007). */
export async function setExamArchived(
  client: TadrissClient,
  id: string,
  archived: boolean,
): Promise<Result<null>> {
  const { count, error } = await client
    .from('exams')
    .update({ deleted_at: archived ? new Date().toISOString() : null }, { count: 'exact' })
    .eq('id', id);
  if (error) return err(toErrorCode(error));
  return (count ?? 0) > 0 ? ok(null) : err('not_found');
}

export async function saveGrades(
  client: TadrissClient,
  input: SaveGradesInput,
): Promise<Result<{ written: number }>> {
  const { data, error } = await client.rpc('save_grades', {
    p_exam_id: input.examId,
    p_grades: input.grades.map((g) => ({
      student_id: g.studentId,
      score: g.score,
      absent: g.absent,
      remark: g.remark,
    })),
  });
  if (error) return err(toErrorCode(error));
  return ok({ written: data });
}

export type MyGrade = {
  examId: string;
  title: string;
  examDate: string;
  maxScore: number;
  coefficient: number;
  term: 1 | 2;
  subjectId: string;
  subjectName: string;
  subjectColor: SubjectColor;
  score: number | null;
  absent: boolean;
  remark: string | null;
};

/** A student's own published marks (RLS hides drafts and everyone else's marks), newest first. */
export async function listMyGrades(client: TadrissClient): Promise<Result<MyGrade[]>> {
  const { data, error } = await client
    .from('exams')
    .select(
      'id, title, exam_date, max_score, coefficient, term, subject_id, subject:subjects!exams_subject_id_institution_id_fkey(name, color), grades:grades!grades_exam_id_institution_id_fkey(score, absent, remark)',
    )
    .is('deleted_at', null)
    .order('exam_date', { ascending: false })
    .limit(300);
  if (error) return err(toErrorCode(error));

  return ok(
    data.flatMap((e) => {
      const mark = e.grades[0];
      const subject = e.subject as { name: string; color: string } | null;
      return mark && subject
        ? [
            {
              examId: e.id,
              title: e.title,
              examDate: e.exam_date,
              maxScore: e.max_score,
              coefficient: e.coefficient,
              term: e.term === 2 ? (2 as const) : (1 as const),
              subjectId: e.subject_id,
              subjectName: subject.name,
              subjectColor: subject.color as SubjectColor,
              score: mark.score,
              absent: mark.absent,
              remark: mark.remark,
            },
          ]
        : [];
    }),
  );
}
