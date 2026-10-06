import { useFormatter, useTranslations } from 'next-intl';
import { cx } from '../ui/cx';

// Small decorative vignettes for the wide feature cards. Copy still comes from messages.

const statuses = [
  { key: 'present', on: 'bg-success-soft text-success ring-success/20' },
  { key: 'absent', on: 'bg-danger-soft text-danger ring-danger/20' },
  { key: 'late', on: 'bg-warning-soft text-warning ring-warning/25' },
  { key: 'excused', on: 'bg-info-soft text-info ring-info/20' },
] as const;
const roster = [
  { key: 's1', pick: 0 },
  { key: 's2', pick: 2 },
  { key: 's3', pick: 0 },
] as const;

export function AttendanceVisual() {
  const t = useTranslations('home.features.visual');
  return (
    <div
      aria-hidden
      className="grid gap-2 rounded-lg border border-border bg-background p-3 shadow-xs"
    >
      {roster.map((r) => (
        <div key={r.key} className="flex items-center gap-3">
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-surface-muted text-[0.7rem] font-semibold text-text-muted">
            {t(r.key).slice(0, 1)}
          </span>
          <span className="flex-1 text-sm">{t(r.key)}</span>
          <span className="flex gap-1">
            {statuses.map((s, i) => (
              <span
                key={s.key}
                className={cx(
                  'inline-flex size-7 items-center justify-center rounded-md text-xs font-semibold ring-1 ring-inset',
                  i === r.pick ? s.on : 'text-text-muted/70 ring-border',
                )}
              >
                {t(s.key)}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

// [day column, row start, row span, tone]
const blocks: [number, number, number, string][] = [
  [1, 1, 2, 'bg-primary-soft ring-primary/15'],
  [2, 2, 1, 'bg-accent-soft ring-accent/20'],
  [3, 1, 1, 'bg-info-soft ring-info/15'],
  [3, 3, 1, 'bg-primary-soft ring-primary/15'],
  [4, 2, 2, 'bg-accent-soft ring-accent/20'],
  [5, 1, 1, 'bg-primary-soft ring-primary/15'],
  [6, 2, 2, 'bg-info-soft ring-info/15'],
];

export function ScheduleVisual() {
  const format = useFormatter();
  return (
    <div aria-hidden className="rounded-lg border border-border bg-background p-3 shadow-xs">
      <div className="grid grid-cols-6 gap-1.5 pb-2 text-center text-[0.65rem] text-text-muted">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i}>{format.dateTime(new Date(2026, 9, 5 + i), { weekday: 'short' })}</span>
        ))}
      </div>
      <div className="grid h-28 grid-cols-6 grid-rows-3 gap-1.5">
        {blocks.map(([col, row, span], i) => (
          <span
            key={i}
            className={cx('rounded-md ring-1 ring-inset', blocks[i]?.[3])}
            style={{ gridColumn: col, gridRow: `${String(row)} / span ${String(span)}` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ReadReceiptVisual() {
  const t = useTranslations('home.features.visual');
  const read = 28;
  const total = 31;
  return (
    <div aria-hidden className="rounded-lg border border-border bg-background p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex -space-x-2 rtl:space-x-reverse">
          {['s1', 's2', 's3'].map((k, i) => (
            <span
              key={k}
              className={cx(
                'inline-flex size-8 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-background',
                [
                  'bg-primary-soft text-primary',
                  'bg-accent-soft text-accent',
                  'bg-info-soft text-info',
                ][i],
              )}
            >
              {t(k as 's1').slice(0, 1)}
            </span>
          ))}
        </div>
        <span className="text-sm text-text-muted">{t('readBy', { read, total })}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${String((read / total) * 100)}%` }}
        />
      </div>
    </div>
  );
}
