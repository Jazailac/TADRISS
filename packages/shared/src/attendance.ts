import type { TadrissClient } from './client';
import { addDays, weekdayOf } from './dates';
import { listRoster } from './classes';
import { err, ok, toErrorCode, type Result } from './result';
import { listSlots, type SlotView } from './schedule';
import type { AttendanceStatus, SubmitAttendanceInput } from './schemas/attendance';
import type { SubjectColor } from './schemas/schedule';

export type StatusCounts = { present: number; late: number; absent: number; excused: number };
export const emptyCounts = (): StatusCounts => ({ present: 0, late: 0, absent: 0, excused: 0 });

/**
 * Attendance rate in percent: late students did attend, and excused absences are not held against
 * anyone, so rate = (present + late) / (all − excused). `null` when nothing counts yet.
 */
export function attendanceRate(c: StatusCounts): number | null {
  const counted = c.present + c.late + c.absent;
  return counted === 0 ? null : Math.round(((c.present + c.late) / counted) * 100);
}

export type DayLesson = {
  slot: SlotView;
  /** A roll call exists for this lesson on this date. */
  taken: boolean;
  sessionId: string | null;
  counts: StatusCounts;
};

type DayRow = {
  session_id: string;
  slot_id: string | null;
  present: number;
  late: number;
  absent: number;
  excused: number;
};

/** Lessons scheduled on a date (RLS-scoped), each with whether and how its roll call went. */
export async function getDayLessons(
  client: TadrissClient,
  opts: { date: string; teacherId?: string },
): Promise<Result<DayLesson[]>> {
  const weekday = weekdayOf(opts.date);
  if (weekday > 6) return ok([]); // Sunday: no school

  const [slots, day] = await Promise.all([
    listSlots(client, opts.teacherId ? { teacherId: opts.teacherId } : {}),
    client.rpc('attendance_day', { p_date: opts.date }),
  ]);
  if (!slots.ok) return slots;
  if (day.error) return err(toErrorCode(day.error));

  const bySlot = new Map<string, DayRow>();
  for (const r of day.data) if (r.slot_id) bySlot.set(r.slot_id, r);

  return ok(
    slots.data
      .filter((s) => s.weekday === weekday)
      .map((slot) => {
        const row = bySlot.get(slot.id);
        return {
          slot,
          taken: row !== undefined,
          sessionId: row?.session_id ?? null,
          counts: row
            ? { present: row.present, late: row.late, absent: row.absent, excused: row.excused }
            : emptyCounts(),
        };
      })
      .sort(
        (a, b) =>
          a.slot.startMin - b.slot.startMin || a.slot.className.localeCompare(b.slot.className),
      ),
  );
}

export type RollCallStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  status: AttendanceStatus | null;
  note: string | null;
};

export type RollCall = {
  slot: SlotView;
  date: string;
  taken: boolean;
  students: RollCallStudent[];
};

/** Everything the roll-call screen needs: the lesson, the roster, and any earlier roll call. */
export async function getRollCall(
  client: TadrissClient,
  slotId: string,
  date: string,
): Promise<Result<RollCall>> {
  const slots = await listSlots(client, { slotId });
  if (!slots.ok) return slots;
  const slot = slots.data[0];
  if (!slot) return err('not_found');

  const [roster, session] = await Promise.all([
    listRoster(client, slot.classId),
    client
      .from('attendance_sessions')
      .select('id')
      .eq('slot_id', slotId)
      .eq('session_date', date)
      .maybeSingle(),
  ]);
  if (!roster.ok) return roster;
  if (session.error) return err(toErrorCode(session.error));

  const marks = new Map<string, { status: AttendanceStatus; note: string | null }>();
  if (session.data) {
    const records = await client
      .from('attendance_records')
      .select('student_id, status, note')
      .eq('session_id', session.data.id);
    if (records.error) return err(toErrorCode(records.error));
    for (const r of records.data)
      marks.set(r.student_id, { status: r.status as AttendanceStatus, note: r.note });
  }

  return ok({
    slot,
    date,
    taken: session.data !== null,
    students: roster.data.map((s) => ({
      studentId: s.studentId,
      firstName: s.firstName,
      lastName: s.lastName,
      status: marks.get(s.studentId)?.status ?? null,
      note: marks.get(s.studentId)?.note ?? null,
    })),
  });
}

export async function submitAttendance(
  client: TadrissClient,
  input: SubmitAttendanceInput,
): Promise<Result<{ sessionId: string }>> {
  const { data, error } = await client.rpc('submit_attendance', {
    p_slot_id: input.slotId,
    p_date: input.date,
    p_records: input.records.map((r) => ({
      student_id: r.studentId,
      status: r.status,
      note: r.note,
    })),
  });
  if (error) return err(toErrorCode(error));
  return ok({ sessionId: data });
}

export type ClassAttendance = {
  classId: string;
  className: string;
  counts: StatusCounts;
  rate: number | null;
};

/** Per-class attendance totals over a date range (inclusive), worst rate first. */
export async function getClassSummary(
  client: TadrissClient,
  from: string,
  to: string,
): Promise<Result<ClassAttendance[]>> {
  const { data, error } = await client.rpc('attendance_class_summary', { p_from: from, p_to: to });
  if (error) return err(toErrorCode(error));
  if (data.length === 0) return ok([]);

  const classes = await client
    .from('classes')
    .select('id, name')
    .in(
      'id',
      data.map((r) => r.class_id),
    );
  if (classes.error) return err(toErrorCode(classes.error));
  const names = new Map(classes.data.map((c) => [c.id, c.name]));

  return ok(
    data
      .map((r) => {
        const counts = { present: r.present, late: r.late, absent: r.absent, excused: r.excused };
        return {
          classId: r.class_id,
          className: names.get(r.class_id) ?? '',
          counts,
          rate: attendanceRate(counts),
        };
      })
      .sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101) || a.className.localeCompare(b.className)),
  );
}

export type MyAttendanceEntry = {
  sessionId: string;
  date: string;
  startMin: number;
  endMin: number;
  subjectName: string;
  subjectColor: SubjectColor;
  status: AttendanceStatus;
  note: string | null;
};

/** A student's own attendance, newest first (RLS shows each student only their own marks). */
export async function listMyAttendance(
  client: TadrissClient,
  opts: { limit?: number; studentId?: string } = {},
): Promise<Result<MyAttendanceEntry[]>> {
  let query = client
    .from('attendance_sessions')
    .select(
      'id, session_date, starts_min, ends_min, subject:subjects!attendance_sessions_subject_id_institution_id_fkey(name, color), records:attendance_records!attendance_records_session_id_institution_id_fkey(status, note)',
    )
    .order('session_date', { ascending: false })
    .order('starts_min', { ascending: false })
    .limit(opts.limit ?? 200);
  // A parent sees every child's marks: narrow the embedded records to one child.
  if (opts.studentId) query = query.eq('records.student_id', opts.studentId);
  const { data, error } = await query;
  if (error) return err(toErrorCode(error));

  return ok(
    data.flatMap((s) => {
      const mark = s.records[0];
      const subject = s.subject as { name: string; color: string } | null;
      return mark && subject
        ? [
            {
              sessionId: s.id,
              date: s.session_date,
              startMin: s.starts_min,
              endMin: s.ends_min,
              subjectName: subject.name,
              subjectColor: subject.color as SubjectColor,
              status: mark.status as AttendanceStatus,
              note: mark.note,
            },
          ]
        : [];
    }),
  );
}

/** Totals for a list of marks. */
export function countStatuses(entries: { status: AttendanceStatus }[]): StatusCounts {
  const c = emptyCounts();
  for (const e of entries) c[e.status] += 1;
  return c;
}

export { addDays };
