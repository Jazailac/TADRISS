import { z } from 'zod';

/** Roles an institution admin can invite. Admins and super_admins are never invited. */
export const memberRoles = ['teacher', 'student', 'parent'] as const;
export type MemberRole = (typeof memberRoles)[number];
export const isMemberRole = (v: unknown): v is MemberRole =>
  (memberRoles as readonly unknown[]).includes(v);

const name = z
  .string()
  .trim()
  .min(1, { error: 'required' })
  .min(2, { error: 'nameMin' })
  .max(100, { error: 'tooLong' });

const email = z
  .string()
  .trim()
  .min(1, { error: 'required' })
  .max(254, { error: 'tooLong' })
  .pipe(z.email({ error: 'email' }))
  // Stored lowercase (DB check): normalise here so "Sara@X.ma" and "sara@x.ma" are one person.
  .transform((v) => v.toLowerCase());

export const inviteInput = z.object({
  firstName: name,
  lastName: name,
  email,
  role: z.enum(memberRoles, { error: 'required' }),
});
export type InviteInput = z.infer<typeof inviteInput>;

export const updateMemberInput = z.object({
  id: z.uuid({ error: 'required' }),
  firstName: name,
  lastName: name,
});
export type UpdateMemberInput = z.infer<typeof updateMemberInput>;

/** Setting the first password after accepting an invitation (or recovering an account). */
export const setPasswordInput = z
  .object({
    password: z
      .string()
      .min(1, { error: 'required' })
      .min(8, { error: 'passwordMin' })
      .max(72, { error: 'tooLong' }),
    confirm: z.string().min(1, { error: 'required' }),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], error: 'passwordMismatch' });
export type SetPasswordInput = z.infer<typeof setPasswordInput>;
