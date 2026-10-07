/**
 * Calendar dates are plain `YYYY-MM-DD` strings end to end. Never `new Date('2026-10-07')` for
 * display or weekday maths: that is UTC midnight and shifts a day in other time zones.
 */

export const isIsoDate = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y = 0, m = 0, d = 0] = v.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

/** The calendar date it is right now in an IANA time zone (the school's, not the server's). */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function weekdayOf(iso: string): number {
  const [y = 0, m = 0, d = 0] = iso.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return day === 0 ? 7 : day;
}

export function addDays(iso: string, days: number): string {
  const [y = 0, m = 0, d = 0] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * A `Date` for formatting a calendar day. Always format it with `timeZone: 'UTC'`: the instant is
 * UTC midnight of that day, so only a UTC formatter is guaranteed to show the same day.
 */
export function utcDate(iso: string): Date {
  const [y = 0, m = 0, d = 0] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Whole days from `from` to `to` (negative when `to` is earlier). Both are `YYYY-MM-DD`. */
export function daysBetween(from: string, to: string): number {
  const [fy = 0, fm = 0, fd = 0] = from.split('-').map(Number);
  const [ty = 0, tm = 0, td = 0] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}
