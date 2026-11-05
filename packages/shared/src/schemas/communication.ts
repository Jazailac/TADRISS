import { z } from 'zod';

const title = z.string().trim().min(1, { error: 'required' }).max(150, { error: 'tooLong' });
const body = z.string().trim().min(1, { error: 'required' }).max(8000, { error: 'tooLong' });

export type Audience = 'all' | 'teachers' | 'students' | 'parents' | 'class';

/**
 * One form value stands for the audience and, for a class, which class: `all`, `teachers`,
 * `students` or `class:<uuid>`. A single select then covers every case without conditional fields.
 */
export function parseAudience(
  value: string,
): { audience: Audience; classId: string | null } | null {
  if (value === 'all' || value === 'teachers' || value === 'students' || value === 'parents')
    return { audience: value, classId: null };
  const m = /^class:(.+)$/.exec(value);
  const id = m?.[1];
  return id && z.uuid().safeParse(id).success ? { audience: 'class', classId: id } : null;
}

export const audienceValue = (audience: Audience, classId: string | null): string =>
  audience === 'class' && classId ? `class:${classId}` : audience;

const audienceField = z
  .string()
  .refine((v) => parseAudience(v) !== null, { error: 'required' })
  .transform((v) => parseAudience(v) as NonNullable<ReturnType<typeof parseAudience>>);

export const announcementInput = z.object({ audience: audienceField, title, body });
export type AnnouncementInput = z.infer<typeof announcementInput>;

/** The audience is fixed once published: readers' "seen" marks depend on it. */
export const updateAnnouncementInput = z.object({ id: z.uuid({ error: 'required' }), title, body });
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementInput>;

export const messageInput = z.object({
  recipientId: z.uuid({ error: 'required' }),
  body: z.string().trim().min(1, { error: 'required' }).max(4000, { error: 'tooLong' }),
});
export type MessageInput = z.infer<typeof messageInput>;
