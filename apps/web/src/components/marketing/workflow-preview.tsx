import { Check, CalendarDays, ReceiptText } from 'lucide-react';
import { formatMoney } from '@tadriss/shared';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Badge } from '../ui/badge';
import {
  gradeScale,
  kindOf,
  lessonTimes,
  monthlyFee,
  sampleMarks,
  type SchoolType,
  type Viewer,
} from './studio-profile';
export type Module = 'attendance' | 'grades' | 'schedule' | 'finance';
const names = ['s1', 's2', 's3'] as const;
const lessons = ['a', 'b', 'c'] as const;

export function WorkflowPreview({
  module,
  type = 'lycee',
  viewer = 'admin',
}: {
  module: Module;
  type?: SchoolType;
  viewer?: Viewer;
}) {
  const t = useTranslations('studio');
  const v = useTranslations('home.features.visual');
  const p = useTranslations('home.preview');
  const f = useFormatter();
  const locale = useLocale();
  // Staff see a roster of students; a parent or a student sees their own lessons.
  const own = viewer === 'parent' || viewer === 'student';
  const marks = sampleMarks(type);
  const scale = gradeScale(type);
  const rows = own
    ? lessons.map((l) => ({ id: l, label: t(`lessons.${type}.${l}`) }))
    : names.map((n) => ({ id: n, label: v(n) }));
  return (
    <div className="workflow-preview" key={`${module}-${type}-${viewer}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t(module)}</h3>
        <Badge tone="neutral">{t('modulePreview')}</Badge>
      </div>
      {module === 'attendance' || module === 'grades' ? (
        <ul className="preview-roster">
          {rows.map((row, i) => (
            <li
              key={row.id}
              className="flex min-w-0 items-center gap-3 border-b border-border py-3.5 last:border-0"
            >
              {own ? (
                <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
              ) : (
                <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                  {row.label.slice(0, 1)}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm" dir="auto">
                {row.label}
              </span>
              {module === 'attendance' ? (
                <Badge tone={i === 1 ? 'warning' : 'success'} dot>
                  {t(i === 1 ? 'late' : 'present')}
                </Badge>
              ) : (
                <span className="grid min-w-20 gap-2 text-end font-mono text-sm tabular-nums">
                  <span>
                    {f.number(marks[i] ?? 0)}
                    <span className="text-text-muted"> / {f.number(scale)}</span>
                  </span>
                  <span className="preview-grade-track" aria-hidden>
                    <span style={{ inlineSize: `${((marks[i] ?? 0) / scale) * 100}%` }} />
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {module === 'schedule' ? (
        <div className="grid grid-cols-3 gap-2">
          {lessonTimes(type).map((time, i) => (
            <div
              key={lessons[i]}
              className="preview-lesson min-w-0 min-h-40 border-s-2 border-primary bg-primary-soft/40 p-2 sm:p-3"
            >
              <CalendarDays className="size-4 text-primary" aria-hidden />
              <p className="mt-5 font-mono text-[0.65rem] leading-5 text-text-muted">
                {f.dateTime(time, {
                  weekday: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'UTC',
                })}
              </p>
              <p className="mt-2 break-words text-xs font-medium leading-relaxed">
                {t(`lessons.${type}.${lessons[i] ?? 'a'}`)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      {module === 'finance' ? (
        <div className="preview-payment border border-border bg-surface p-5">
          <div className="flex justify-between">
            <ReceiptText className="size-6 text-accent" aria-hidden />
            {own ? (
              <Badge tone="warning">{p('status.due')}</Badge>
            ) : (
              <Badge tone="success">{p('status.paid')}</Badge>
            )}
          </div>
          <p className="mt-5 text-xs text-text-muted">{t('feeItem', { kind: kindOf(type) })}</p>
          <p className="mt-2 font-mono text-2xl tabular-nums">
            {formatMoney(monthlyFee(type), locale)}
          </p>
          <div className="mt-5 flex items-center gap-2 border-t border-dashed border-border pt-3 text-xs text-text-muted">
            {own ? null : <Check className="size-3 text-success" aria-hidden />}
            <span dir="auto">{p('payment.p1.name')}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
