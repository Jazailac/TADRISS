import { z } from 'zod';

/**
 * Error messages are i18n keys under `validation.*` in every app, never prose,
 * so the same schema produces translated errors on web and mobile.
 */
export const validationKeys = [
  'required',
  'email',
  'passwordMin',
  'passwordMismatch',
  'nameMin',
  'tooLong',
  'capacityRange',
  'invalidYear',
  'invalidTime',
  'timeOrder',
  'invalidDate',
  'maxScoreRange',
  'coefficientRange',
  'invalidAmount',
  'fileRequired',
  'fileTooLarge',
  'fileType',
] as const;
export type ValidationKey = (typeof validationKeys)[number];

const email = z
  .string()
  .trim()
  .min(1, { error: 'required' })
  .max(254, { error: 'tooLong' })
  .pipe(z.email({ error: 'email' }));

const name = z
  .string()
  .trim()
  .min(1, { error: 'required' })
  .min(2, { error: 'nameMin' })
  .max(100, { error: 'tooLong' });

export const loginInput = z.object({
  email,
  password: z.string().min(1, { error: 'required' }),
});
export type LoginInput = z.infer<typeof loginInput>;

export const signupInput = z.object({
  institutionName: name,
  firstName: name,
  lastName: name,
  email,
  password: z
    .string()
    .min(1, { error: 'required' })
    .min(8, { error: 'passwordMin' })
    .max(72, { error: 'tooLong' }),
});
export type SignupInput = z.infer<typeof signupInput>;

/** Flattens zod issues to `{ field: validationKey }` (first issue per field). */
export function fieldErrors(error: z.ZodError): Partial<Record<string, ValidationKey>> {
  const out: Partial<Record<string, ValidationKey>> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? '');
    if (!(field in out))
      out[field] = (validationKeys as readonly string[]).includes(issue.message)
        ? (issue.message as ValidationKey)
        : 'required';
  }
  return out;
}
