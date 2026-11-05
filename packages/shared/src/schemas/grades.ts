import { z } from 'zod';
import { isIsoDate } from '../dates';

/**
 * Reads a mark typed by a person: `15`, `15.5` and `15,5` (French keyboards) all work, blanks mean
 * "no mark yet". Returns `{ ok: false }` for anything else, so the UI can flag the cell.
 */
export function parseScore(input: string): { ok: true; value: number | null } | { ok: false } {
  const s = input.trim().replace(',', '.');
  if (s === '') return { ok: true, value: null };
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return { ok: false };
  return { ok: true, value: Number(s) };
}

const title = z.string().trim().min(1, { error: 'required' }).max(150, { error: 'tooLong' });
const examDate = z.string().refine(isIsoDate, { error: 'invalidDate' });

// Forms post "20", "1,5", "".
const decimal = (error: string, min: number, max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? Number(v.trim().replace(',', '.')) : v),
    z
      .number({ error })
      .min(min, { error })
      .max(max, { error })
      .refine((n) => Math.round(n * 2) === n * 2 || Number.isInteger(n * 100), { error }),
  );

const examFields = {
  subjectId: z.uuid({ error: 'required' }),
  title,
  examDate,
  maxScore: decimal('maxScoreRange', 1, 100),
  // Half steps: 0.5, 1, 1.5, … 10.
  coefficient: decimal('coefficientRange', 0.5, 10).refine((n) => Number.isInteger(n * 2), {
    error: 'coefficientRange',
  }),
  term: z.preprocess(
    (v) => (typeof v === 'string' ? Number(v) : v),
    z.union([z.literal(1), z.literal(2)], { error: 'required' }),
  ),
};

export const examInput = z.object({ classId: z.uuid({ error: 'required' }), ...examFields });
export type ExamInput = z.infer<typeof examInput>;

/** The class is fixed once the exam exists. */
export const updateExamInput = z.object({ id: z.uuid({ error: 'required' }), ...examFields });
export type UpdateExamInput = z.infer<typeof updateExamInput>;

export const saveGradesInput = z.object({
  examId: z.uuid({ error: 'required' }),
  grades: z
    .array(
      z.object({
        studentId: z.uuid({ error: 'required' }),
        score: z.number().min(0).max(100).nullable(),
        absent: z.boolean(),
        remark: z
          .string()
          .trim()
          .max(300, { error: 'tooLong' })
          .transform((v) => (v === '' ? null : v))
          .nullable()
          .optional()
          .transform((v) => v ?? null),
      }),
    )
    .max(300),
});
export type SaveGradesInput = z.infer<typeof saveGradesInput>;

// ── averages ────────────────────────────────────────────────────────────────

export type MarkForAverage = {
  subjectId: string;
  score: number | null;
  absent: boolean;
  maxScore: number;
  coefficient: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
/** A mark on the 0-20 scale. */
export const normalise20 = (score: number, maxScore: number) => (score / maxScore) * 20;

/**
 * Coefficient-weighted average on /20: Σ(mark/max × 20 × coef) / Σcoef. Absent and blank marks are
 * left out entirely (neither a zero nor part of the weights). `null` when nothing counts.
 */
export function weightedAverage20(marks: MarkForAverage[]): number | null {
  let total = 0;
  let weights = 0;
  for (const m of marks) {
    if (m.absent || m.score === null) continue;
    total += normalise20(m.score, m.maxScore) * m.coefficient;
    weights += m.coefficient;
  }
  return weights === 0 ? null : round2(total / weights);
}

/** Average per subject (only subjects that have at least one counted mark). */
export function subjectAverages(marks: MarkForAverage[]): Map<string, number> {
  const bySubject = new Map<string, MarkForAverage[]>();
  for (const m of marks) bySubject.set(m.subjectId, [...(bySubject.get(m.subjectId) ?? []), m]);
  const out = new Map<string, number>();
  for (const [subjectId, list] of bySubject) {
    const avg = weightedAverage20(list);
    if (avg !== null) out.set(subjectId, avg);
  }
  return out;
}

/** The general average: the mean of the subject averages (each subject weighs the same). */
export function overallAverage(marks: MarkForAverage[]): number | null {
  const averages = [...subjectAverages(marks).values()];
  return averages.length === 0
    ? null
    : round2(averages.reduce((a, b) => a + b, 0) / averages.length);
}

export type Mention = 'tresBien' | 'bien' | 'assezBien' | 'passable' | 'insuffisant';

/** Moroccan mentions: ≥16 très bien, ≥14 bien, ≥12 assez bien, ≥10 passable, below that insuffisant. */
export function mention(average20: number): Mention {
  if (average20 >= 16) return 'tresBien';
  if (average20 >= 14) return 'bien';
  if (average20 >= 12) return 'assezBien';
  if (average20 >= 10) return 'passable';
  return 'insuffisant';
}
