import { formatMoney } from '@tadriss/shared';
import { CalendarCheck, Wallet, Users } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Badge, type Tone } from '../ui/badge';
import { Mark } from '../ui/logo';

// Illustrative content for the marketing mock (all copy comes from messages).
const schedule = [
  { key: 'math', time: '08:00' },
  { key: 'physics', time: '10:00' },
  { key: 'french', time: '14:00' },
] as const;
const payments: {
  key: 'p1' | 'p2' | 'p3';
  amount: number;
  tone: Tone;
  status: 'paid' | 'partial' | 'due';
}[] = [
  { key: 'p1', amount: 180000, tone: 'success', status: 'paid' },
  { key: 'p2', amount: 25000, tone: 'warning', status: 'partial' },
  { key: 'p3', amount: 150000, tone: 'neutral', status: 'due' },
];

const asDate = (hhmm: string) => new Date(`2026-10-05T${hhmm}:00`);

/** A faithful miniature of the admin dashboard, built from the real UI kit. */
export function ProductPreview() {
  const t = useTranslations('home.preview');
  const studio = useTranslations('studio');
  const format = useFormatter();
  const locale = useLocale();

  const kpis = [
    {
      icon: CalendarCheck,
      label: t('attendance'),
      value: format.number(0.96, { style: 'percent' }),
    },
    { icon: Users, label: t('students'), value: format.number(412) },
    { icon: Wallet, label: t('collected'), value: formatMoney(18_450_000, locale) },
  ];

  return (
    <div className="relative rounded-2xl border border-border bg-surface/80 p-1.5 shadow-lg backdrop-blur">
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        {/* window chrome */}
        <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
          <Mark className="size-5 text-primary" />
          <span className="text-sm font-semibold">{t('school')}</span>
          <span className="ms-auto rounded-full bg-primary-soft px-2 py-1 font-mono text-[0.6rem] font-medium uppercase tracking-[0.08em] text-primary">
            {studio('preview')}
          </span>
          <span className="ms-3 font-mono text-xs text-text-muted tabular-nums">
            {format.dateTime(asDate('08:00'), { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        <div className="grid gap-3 p-4">
          <p className="display text-xl">{t('greeting')}</p>

          <div className="grid grid-cols-3 gap-2">
            {kpis.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-surface p-3">
                <Icon className="size-4 text-accent" strokeWidth={1.75} aria-hidden />
                <p className="mt-2 truncate font-mono text-sm font-medium tabular-nums sm:text-base">
                  {value}
                </p>
                <p className="truncate text-[0.7rem] text-text-muted">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_1.35fr]">
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs font-medium text-text-muted">{t('today')}</p>
              <ol className="mt-2 grid gap-2">
                {schedule.map((s) => (
                  <li key={s.key} className="flex items-start gap-2.5">
                    <span className="mt-0.5 font-mono text-[0.7rem] text-text-muted tabular-nums">
                      {format.dateTime(asDate(s.time), { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="border-s-2 border-primary/40 ps-2 text-xs leading-snug">
                      {t(`schedule.${s.key}`)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs font-medium text-text-muted">{t('payments')}</p>
              <ul className="mt-2 grid divide-y divide-border">
                {payments.map((p) => (
                  <li key={p.key} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {t(`payment.${p.key}.name`)}
                      </span>
                      <span className="block truncate text-[0.7rem] text-text-muted">
                        {t(`payment.${p.key}.item`)}
                      </span>
                    </span>
                    <span className="font-mono text-[0.7rem] tabular-nums">
                      {formatMoney(p.amount, locale)}
                    </span>
                    <Badge tone={p.tone} className="hidden sm:inline-flex">
                      {t(`status.${p.status}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
