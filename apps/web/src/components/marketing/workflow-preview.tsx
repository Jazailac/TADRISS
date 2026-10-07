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
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{t(module)}</h3>
        <Badge tone="neutral">{t('modulePreview')}</Badge>
      </div>
      {module === 'attendance' || module === 'grades' ? (
        <div className="grid gap-2">
          {names.map((name, i) => (
            <div
              key={name}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                {v(name).slice(0, 1)}
              </span>
              <span className="flex-1 text-sm">{v(name)}</span>
              {module === 'attendance' ? (
                <Badge tone={i === 1 ? 'warning' : 'success'} dot>
                  {t(i === 1 ? 'late' : 'present')}
                </Badge>
              ) : (
                <span className="font-mono text-sm tabular-nums">
                  {f.number([16, 14.5, 18][i] ?? 0)}
                  <span className="text-text-muted"> / {f.number(20)}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {module === 'schedule' ? (
        <div className="grid grid-cols-3 gap-2">
          {(['math', 'physics', 'french'] as const).map((subject, i) => (
            <div
              key={subject}
              className="min-h-40 rounded-lg border border-border bg-primary-soft/40 p-3"
            >
              <CalendarDays className="size-4 text-primary" aria-hidden />
              <p className="mt-5 font-mono text-xs text-text-muted">
                {f.dateTime(new Date(2026, 9, 5 + i, 8 + i), {
                  weekday: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="mt-2 text-xs font-medium leading-relaxed">{p(`schedule.${subject}`)}</p>
            </div>
          ))}
        </div>
      ) : null}
      {module === 'finance' ? (
        <div className="rounded-xl border border-border bg-surface p-5">
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
