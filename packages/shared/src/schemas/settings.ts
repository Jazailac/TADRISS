import { z } from 'zod';
import { locales } from '../locale';

/** Time zones a school can pick (Morocco first). The list is a product choice, not the whole IANA set. */
export const timezones = [
  'Africa/Casablanca',
  'Africa/Algiers',
  'Africa/Tunis',
  'Europe/Paris',
  'Europe/Madrid',
  'UTC',
] as const;

/** Modules the administration can switch off, per role (they are also the navigation keys). */
export const roleModules = {
  teacher: [
    'classes',
    'schedule',
    'attendance',
    'homework',
    'grades',
    'announcements',
    'messages',
    'documents',
  ],
  student: [
    'schedule',
    'homework',
    'attendance',
    'grades',
    'payments',
    'announcements',
    'messages',
    'documents',
  ],
} as const;
export type ConfigurableRole = keyof typeof roleModules;
export type ModuleKey = (typeof roleModules)[ConfigurableRole][number];

const optionalText = (max: number, min = 0) =>
  z
    .string()
    .trim()
    .max(max, { error: 'tooLong' })
    .refine((v) => v === '' || v.length >= min, { error: 'tooShort' })
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export const settingsInput = z.object({
  name: z.string().trim().min(2, { error: 'nameMin' }).max(150, { error: 'tooLong' }),
  defaultLocale: z.enum(locales, { error: 'required' }),
  timezone: z.enum(timezones, { error: 'required' }),
  phone: optionalText(30, 3),
  address: optionalText(200),
  city: optionalText(100),
});
export type SettingsInput = z.infer<typeof settingsInput>;

export const moduleAccessInput = z.object({
  role: z.enum(['teacher', 'student']),
  module: z.string(),
  enabled: z.boolean(),
});
