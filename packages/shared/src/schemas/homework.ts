import { z } from 'zod';
import { isIsoDate } from '../dates';

const title = z.string().trim().min(1, { error: 'required' }).max(150, { error: 'tooLong' });

const description = z
  .string()
  .trim()
  .max(4000, { error: 'tooLong' })
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const dueDate = z.string().refine(isIsoDate, { error: 'invalidDate' });

export const homeworkInput = z.object({
  classId: z.uuid({ error: 'required' }),
  subjectId: z.uuid({ error: 'required' }),
  title,
  description,
  dueDate,
});
export type HomeworkInput = z.infer<typeof homeworkInput>;

/** The class is fixed once the homework exists. */
export const updateHomeworkInput = z.object({
  id: z.uuid({ error: 'required' }),
  subjectId: z.uuid({ error: 'required' }),
  title,
  description,
  dueDate,
});
export type UpdateHomeworkInput = z.infer<typeof updateHomeworkInput>;
