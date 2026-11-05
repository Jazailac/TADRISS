import { Check, CalendarDays, ReceiptText } from 'lucide-react';
import { formatMoney } from '@tadriss/shared';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Badge } from '../ui/badge';
export type Module = 'attendance' | 'grades' | 'schedule' | 'finance';
const names = ['s1', 's2', 's3'] as const;
export function WorkflowPreview({ module }: { module: Module }) {
  const t = useTranslations('studio');
  const v = useTranslations('home.features.visual');
  const p = useTranslations('home.preview');
  const f = useFormatter();
  const locale = useLocale();
  return (
    <div className="workflow-preview" key={module}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t(module)}</h3>
        <Badge tone="neutral">{t('modulePreview')}</Badge>
      </div>
      {module === 'attendance' || module === 'grades' ? (
        <ul className="preview-roster">
          {names.map((name, i) => (
            <li
              key={name}
              className="flex min-w-0 items-center gap-3 border-b border-border py-3.5 last:border-0"
            >
              <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                {v(name).slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm" dir="auto">
                {v(name)}
              </span>
              {module === 'attendance' ? (
                <Badge tone={i === 1 ? 'warning' : 'success'} dot>
                  {t(i === 1 ? 'late' : 'present')}
                </Badge>
              ) : (
                <span className="grid min-w-20 gap-2 text-end font-mono text-sm tabular-nums">
                  <span>
                    {f.number([16, 14.5, 18][i] ?? 0)}
                    <span className="text-text-muted"> / {f.number(20)}</span>
                  </span>
                  <span className="preview-grade-track" aria-hidden>
                    <span style={{ inlineSize: `${([16, 14.5, 18][i] ?? 0) * 5}%` }} />
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {module === 'schedule' ? (
        <div className="grid grid-cols-3 gap-2">
          {(['math', 'physics', 'french'] as const).map((subject, i) => (
            <div
              key={subject}
              className="preview-lesson min-w-0 min-h-40 border-s-2 border-primary bg-primary-soft/40 p-2 sm:p-3"
            >
              <CalendarDays className="size-4 text-primary" aria-hidden />
              <p className="mt-5 font-mono text-[0.65rem] leading-5 text-text-muted">
                {f.dateTime(new Date(Date.UTC(2026, 9, 5 + i, 8 + i)), {
                  weekday: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'UTC',
                })}
              </p>
              <p className="mt-2 break-words text-xs font-medium leading-relaxed">
                {p(`schedule.${subject}`)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      {module === 'finance' ? (
        <div className="preview-payment border border-border bg-surface p-5">
          <div className="flex justify-between">
            <ReceiptText className="size-6 text-accent" aria-hidden />
            <Badge tone="success">{p('status.paid')}</Badge>
          </div>
          <p className="mt-5 text-xs text-text-muted">{p('payment.p1.item')}</p>
          <p className="mt-2 font-mono text-2xl tabular-nums">{formatMoney(180000, locale)}</p>
          <div className="mt-5 flex items-center gap-2 border-t border-dashed border-border pt-3 text-xs text-text-muted">
            <Check className="size-3 text-success" aria-hidden />
            {p('payment.p1.name')}
          </div>
        </div>
      ) : null}
    </div>
  );
}
