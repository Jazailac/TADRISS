import { z } from 'zod';
import { isIsoDate } from '../dates';

export const attendanceStatuses = ['present', 'late', 'absent', 'excused'] as const;
export type AttendanceStatus = (typeof attendanceStatuses)[number];

/** Teachers can correct a roll call for this many days; admins have no limit (matches the RPC). */
export const ATTENDANCE_EDIT_WINDOW_DAYS = 14;

export const submitAttendanceInput = z.object({
  slotId: z.uuid({ error: 'required' }),
  date: z.string().refine(isIsoDate, { error: 'required' }),
  records: z
    .array(
      z.object({
        studentId: z.uuid({ error: 'required' }),
        status: z.enum(attendanceStatuses, { error: 'required' }),
        note: z
          .string()
          .trim()
          .max(300, { error: 'tooLong' })
          .transform((v) => (v === '' ? null : v))
          .nullable()
          .optional()
          .transform((v) => v ?? null),
      }),
    )
    .max(200),
});
export type SubmitAttendanceInput = z.infer<typeof submitAttendanceInput>;
