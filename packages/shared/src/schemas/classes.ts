import { z } from 'zod';

/** '2026-2027': the Moroccan school year starts in September. */
export const schoolYearPattern = /^(\d{4})-(\d{4})$/;
export const isSchoolYear = (v: unknown): v is string => {
  const m = typeof v === 'string' ? schoolYearPattern.exec(v) : null;
  return m !== null && Number(m[2]) === Number(m[1]) + 1;
};

/** The school year a date falls in (September starts a new one). */
export function currentSchoolYear(now: Date = new Date()): string {
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

/** Previous, current and next school year: what a school realistically works with. */
export function schoolYearOptions(now: Date = new Date()): string[] {
  const start = Number(currentSchoolYear(now).slice(0, 4));
  return [start - 1, start, start + 1].map((y) => `${y}-${y + 1}`);
}

const name = z.string().trim().min(1, { error: 'required' }).max(60, { error: 'tooLong' });

// Forms post empty strings for blank optional fields.
const optionalText = z
  .string()
  .trim()
  .max(60, { error: 'tooLong' })
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const capacity = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z
    .number({ error: 'capacityRange' })
    .int({ error: 'capacityRange' })
    .min(1, { error: 'capacityRange' })
    .max(200, { error: 'capacityRange' })
    .nullable(),
);

const schoolYear = z.string().refine(isSchoolYear, { error: 'invalidYear' });

export const classInput = z.object({
  name,
  level: optionalText,
  schoolYear,
  capacity,
});
export type ClassInput = z.infer<typeof classInput>;

/** The school year is fixed once a class exists: enrolments reference it. */
export const updateClassInput = z.object({
  id: z.uuid({ error: 'required' }),
  name,
  level: optionalText,
  capacity,
});
export type UpdateClassInput = z.infer<typeof updateClassInput>;
