import type { TadrissClient } from './client';
import { err, ok, toErrorCode, type Result } from './result';
import type {
  SlotInput,
  SubjectColor,
  SubjectInput,
  UpdateSlotInput,
  UpdateSubjectInput,
  Weekday,
} from './schemas/schedule';

export type Subject = { id: string; name: string; color: SubjectColor; archived: boolean };

export async function listSubjects(
  client: TadrissClient,
  opts: { includeArchived?: boolean } = {},
): Promise<Result<Subject[]>> {
  let query = client
    .from('subjects')
    .select('id, name, color, deleted_at')
    .order('name', { ascending: true })
    .limit(200);
  if (!opts.includeArchived) query = query.is('deleted_at', null);
  const { data, error } = await query;
  if (error) return err(toErrorCode(error));
  return ok(
    data.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color as SubjectColor,
      archived: s.deleted_at !== null,
    })),
  );
}

export async function createSubject(
  client: TadrissClient,
  institutionId: string,
  input: SubjectInput,
): Promise<Result<{ id: string }>> {
  const { data, error } = await client
    .from('subjects')
    .insert({ institution_id: institutionId, name: input.name, color: input.color })
    .select('id')
    .single();
  if (error) return err(toErrorCode(error));
  return ok({ id: data.id });
}

export async function updateSubject(
  client: TadrissClient,
  input: UpdateSubjectInput,
): Promise<Result<null>> {
  const { data, error } = await client
    .from('subjects')
    .update({ name: input.name, color: input.color })
    .eq('id', input.id)
    .select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}

export async function setSubjectArchived(
  client: TadrissClient,
  id: string,
  archived: boolean,
): Promise<Result<null>> {
  const { data, error } = await client
    .from('subjects')
    .update({ deleted_at: archived ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}

export type SlotView = {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectColor: SubjectColor;
  teacherId: string;
  teacherName: string;
  weekday: Weekday;
  startMin: number;
  endMin: number;
  room: string | null;
};

// One literal (not concatenated) so the typed query builder can infer the embedded rows.
const SLOT_COLUMNS =
  'id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min, room, class:classes!timetable_slots_class_id_institution_id_fkey(name), subject:subjects!timetable_slots_subject_id_institution_id_fkey(name, color)' as const;

/**
 * Lessons the caller may see (RLS decides): everything (admin), the classes a teacher teaches, or a
 * student's own class. Optionally narrowed to one class or one teacher.
 */
export async function listSlots(
  client: TadrissClient,
  opts: { classId?: string; teacherId?: string; slotId?: string } = {},
): Promise<Result<SlotView[]>> {
  let query = client
    .from('timetable_slots')
    .select(SLOT_COLUMNS)
    .order('weekday', { ascending: true })
    .order('starts_min', { ascending: true })
    .limit(1000);
  if (opts.classId) query = query.eq('class_id', opts.classId);
  if (opts.teacherId) query = query.eq('teacher_id', opts.teacherId);
  if (opts.slotId) query = query.eq('id', opts.slotId);
  const { data, error } = await query;
  if (error) return err(toErrorCode(error));

  const teacherIds = [...new Set(data.map((s) => s.teacher_id))];
  const people =
    teacherIds.length > 0
      ? await client.from('profiles').select('id, first_name, last_name').in('id', teacherIds)
      : { data: [], error: null };
  if (people.error) return err(toErrorCode(people.error));
  const names = new Map(people.data.map((p) => [p.id, `${p.first_name} ${p.last_name}`]));

  return ok(
    data.flatMap((s) => {
      // The generated type says these embeds are always present, but RLS hides an archived class
      // (or subject) from non-admins, so at runtime they can be null.
      const cls = s.class as { name: string } | null;
      const subject = s.subject as { name: string; color: string } | null;
      return cls && subject
        ? [
            {
              id: s.id,
              classId: s.class_id,
              className: cls.name,
              subjectId: s.subject_id,
              subjectName: subject.name,
              subjectColor: subject.color as SubjectColor,
              teacherId: s.teacher_id,
              teacherName: names.get(s.teacher_id) ?? '',
              weekday: s.weekday as Weekday,
              startMin: s.starts_min,
              endMin: s.ends_min,
              room: s.room,
            },
          ]
        : [];
    }),
  );
}

export async function createSlot(
  client: TadrissClient,
  institutionId: string,
  input: SlotInput,
): Promise<Result<{ id: string }>> {
  const { data, error } = await client
    .from('timetable_slots')
    .insert({
      institution_id: institutionId,
      class_id: input.classId,
      subject_id: input.subjectId,
      teacher_id: input.teacherId,
      weekday: input.weekday,
      starts_min: input.start,
      ends_min: input.end,
      room: input.room,
    })
    .select('id')
    .single();
  if (error) return err(toErrorCode(error));
  return ok({ id: data.id });
}

export async function updateSlot(
  client: TadrissClient,
  input: UpdateSlotInput,
): Promise<Result<null>> {
  const { data, error } = await client
    .from('timetable_slots')
    .update({
      subject_id: input.subjectId,
      teacher_id: input.teacherId,
      weekday: input.weekday,
      starts_min: input.start,
      ends_min: input.end,
      room: input.room,
    })
    .eq('id', input.id)
    .select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}

export async function deleteSlot(client: TadrissClient, id: string): Promise<Result<null>> {
  const { data, error } = await client.from('timetable_slots').delete().eq('id', id).select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}
