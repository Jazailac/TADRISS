import { daysBetween } from '@tadriss/shared';
import type { getFormatter, getTranslations } from 'next-intl/server';
import type { Tone } from '../ui/badge';

type T = Awaited<ReturnType<typeof getTranslations<'homework'>>>;
type F = Awaited<ReturnType<typeof getFormatter>>;

/** How to say "due in N days" for a homework, and how urgent it looks (dates are `YYYY-MM-DD`). */
export function dueInfo(
  t: T,
  f: F,
  dueDate: string,
  today: string,
  done = false,
): { text: string; tone: Tone } {
  const days = daysBetween(today, dueDate);
  const absolute = t('due.on', {
    date: f.dateTime(new Date(`${dueDate}T12:00:00Z`), { dateStyle: 'medium', timeZone: 'UTC' }),
  });
  if (done) return { text: absolute, tone: 'neutral' };
  if (days < 0) return { text: t('due.late', { days: -days }), tone: 'danger' };
  if (days === 0) return { text: t('due.today'), tone: 'warning' };
  if (days === 1) return { text: t('due.tomorrow'), tone: 'warning' };
  if (days <= 7) return { text: t('due.in', { days }), tone: 'info' };
  return { text: absolute, tone: 'neutral' };
}
