import { z } from 'zod';

/** 1 = Monday … 6 = Saturday: the Moroccan school week. */
export const weekdays = [1, 2, 3, 4, 5, 6] as const;
export type Weekday = (typeof weekdays)[number];

export const subjectColors = ['primary', 'accent', 'info', 'success', 'warning'] as const;
export type SubjectColor = (typeof subjectColors)[number];

/** Lessons live between 06:00 and 22:00 (matches the database check). */
export const DAY_START_MIN = 6 * 60;
export const DAY_END_MIN = 22 * 60;

export const timeToMinutes = (hhmm: string): number => {
  const [h = '0', m = '0'] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
};
export const minutesToTime = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'invalidTime' })
  .transform(timeToMinutes)
  .refine((m) => m >= DAY_START_MIN && m <= DAY_END_MIN, { error: 'invalidTime' });

const optionalRoom = z
  .string()
  .trim()
  .max(40, { error: 'tooLong' })
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const slotFields = {
  subjectId: z.uuid({ error: 'required' }),
  teacherId: z.uuid({ error: 'required' }),
  weekday: z.preprocess(
    (v) => (typeof v === 'string' && v !== '' ? Number(v) : v),
    z
      .number({ error: 'required' })
      .int({ error: 'required' })
      .min(1, { error: 'required' })
      .max(6, { error: 'required' }),
  ),
  start: time,
  end: time,
  room: optionalRoom,
};

function endAfterStart(v: { start: number; end: number }, ctx: z.RefinementCtx) {
  if (v.end <= v.start) ctx.addIssue({ code: 'custom', path: ['end'], message: 'timeOrder' });
}

export const slotInput = z
  .object({ classId: z.uuid({ error: 'required' }), ...slotFields })
  .superRefine(endAfterStart);
export type SlotInput = z.infer<typeof slotInput>;

export const updateSlotInput = z
  .object({ id: z.uuid({ error: 'required' }), ...slotFields })
  .superRefine(endAfterStart);
export type UpdateSlotInput = z.infer<typeof updateSlotInput>;

const subjectName = z.string().trim().min(1, { error: 'required' }).max(80, { error: 'tooLong' });

export const subjectInput = z.object({
  name: subjectName,
  color: z.enum(subjectColors, { error: 'required' }),
});
export type SubjectInput = z.infer<typeof subjectInput>;

export const updateSubjectInput = subjectInput.extend({ id: z.uuid({ error: 'required' }) });
export type UpdateSubjectInput = z.infer<typeof updateSubjectInput>;
