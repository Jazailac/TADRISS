import { formatMoney } from '@tadriss/shared';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck,
  Download,
  Megaphone,
  Plus,
  ReceiptText,
  Users,
  Wallet,
} from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Badge, type Tone } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { Field, FieldError, Input, Label } from '../ui/field';
import { PendingDemo } from './pending-demo';

const kpis = [
  { key: 'students', icon: Users, value: { n: 412 }, delta: 12, up: true },
  { key: 'attendance', icon: CalendarCheck, value: { pct: 0.964 }, delta: 1.2, up: true },
  { key: 'collected', icon: Wallet, value: { mad: 18_450_000 }, delta: 78, up: true },
  { key: 'overdue', icon: ReceiptText, value: { n: 23 }, delta: 5, up: false },
] as const;

const week = [0.97, 0.95, 0.93, 0.96, 0.98, 0.91];
const day = (i: number) => new Date(2026, 9, 5 + i);

const schedule = [
  { key: 's1', start: '08:00', end: '09:55' },
  { key: 's2', start: '10:00', end: '11:55' },
  { key: 's3', start: '14:00', end: '15:55' },
] as const;

const rows: {
  key: 'r1' | 'r2' | 'r3' | 'r4';
  amount: number;
  tone: Tone;
  status: 'paid' | 'partial' | 'due' | 'overdue';
}[] = [
  { key: 'r1', amount: 180_000, tone: 'success', status: 'paid' },
  { key: 'r2', amount: 25_000, tone: 'warning', status: 'partial' },
  { key: 'r3', amount: 150_000, tone: 'neutral', status: 'due' },
  { key: 'r4', amount: 180_000, tone: 'danger', status: 'overdue' },
];

const at = (hhmm: string) => new Date(`2026-10-05T${hhmm}:00`);

export function DashboardPreview() {
  const t = useTranslations('demo');
  const format = useFormatter();
  const locale = useLocale();

  const show = (v: (typeof kpis)[number]['value']) =>
    'mad' in v
      ? formatMoney(v.mad, locale)
      : 'pct' in v
        ? format.number(v.pct, { style: 'percent', maximumFractionDigits: 1 })
        : format.number(v.n);

  return (
    <div className="mx-auto grid grid-cols-1 max-w-6xl gap-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">
            {format.dateTime(day(0), {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <h1 className="display mt-3 text-4xl font-medium">{t('title')}</h1>
          <p className="mt-2 text-text-muted">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Download className="size-4" aria-hidden />}>
            {t('export')}
          </Button>
          <Button icon={<CalendarCheck className="size-4" aria-hidden />}>
            {t('takeAttendance')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ key, icon: Icon, value, delta, up }) => (
          <Card key={key} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-muted">{t(`kpi.${key}.label`)}</p>
              <Icon className="size-4 text-text-muted" strokeWidth={1.75} aria-hidden />
            </div>
            <p className="mt-3 font-mono text-[1.65rem] font-medium tracking-tight tabular-nums">
              {show(value)}
            </p>
            <p
              className={cx(
                'mt-1 flex items-center gap-1 text-xs',
                up ? 'text-success' : 'text-danger',
              )}
            >
              {up ? (
                <ArrowUpRight className="size-3.5" aria-hidden />
              ) : (
                <ArrowDownRight className="size-3.5" aria-hidden />
              )}
              {t(`kpi.${key}.delta`, { value: delta })}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">{t('week.title')}</h2>
            <span className="text-sm text-text-muted">
              {t('week.average', { value: format.number(0.95, { style: 'percent' }) })}
            </span>
          </div>
          <div
            className="mt-6 grid h-48 grid-cols-6 items-end gap-3"
            role="img"
            aria-label={t('week.title')}
          >
            {week.map((v, i) => (
              <div key={i} className="flex h-full flex-col items-center justify-end gap-2">
                <span className="font-mono text-[0.7rem] text-text-muted tabular-nums">
                  {format.number(v, { style: 'percent' })}
                </span>
                <div
                  className="w-full rounded-t-md bg-primary/85 transition-colors hover:bg-primary"
                  style={{ height: `${String((v - 0.8) * 500)}%` }}
                />
                <span className="text-xs text-text-muted">
                  {format.dateTime(day(i), { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold">{t('today.title')}</h2>
          <ol className="mt-5 grid gap-4">
            {schedule.map((s) => (
              <li key={s.key} className="grid grid-cols-[4.5rem_1fr] gap-3">
                <span className="font-mono text-xs text-text-muted tabular-nums">
                  {format.dateTime(at(s.start), { hour: '2-digit', minute: '2-digit' })}
                  <br />
                  {format.dateTime(at(s.end), { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="rounded-md border-s-2 border-primary bg-primary-soft/50 px-3 py-2">
                  <p className="text-sm font-medium">{t(`today.${s.key}.subject`)}</p>
                  <p className="text-xs text-text-muted">{t(`today.${s.key}.detail`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold">{t('payments.title')}</h2>
          <Button size="sm" variant="ghost">
            {t('payments.viewAll')}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50 text-start text-xs text-text-muted">
                {(['student', 'item', 'amount', 'status'] as const).map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className={cx(
                      'px-6 py-2.5 font-medium',
                      c === 'amount' ? 'text-end' : 'text-start',
                    )}
                  >
                    {t(`payments.cols.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.key} className="transition-colors hover:bg-surface-muted/40">
                  <td className="px-6 py-3.5">
                    <p className="font-medium">{t(`payments.rows.${r.key}.name`)}</p>
                    <p className="text-xs text-text-muted">{t(`payments.rows.${r.key}.class`)}</p>
                  </td>
                  <td className="px-6 py-3.5 text-text-muted">
                    {t(`payments.rows.${r.key}.item`)}
                  </td>
                  <td className="px-6 py-3.5 text-end font-mono tabular-nums">
                    {formatMoney(r.amount, locale)}
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge tone={r.tone} dot>
                      {t(`payments.status.${r.status}`)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col items-center justify-center p-10 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-surface-muted text-text-muted ring-1 ring-border">
            <Megaphone className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <h2 className="mt-4 font-semibold">{t('empty.title')}</h2>
          <p className="mt-1 max-w-xs text-sm text-text-muted">{t('empty.body')}</p>
          <Button className="mt-5" size="sm" icon={<Plus className="size-4" aria-hidden />}>
            {t('empty.action')}
          </Button>
        </Card>

        <Card className="grid gap-5 p-6">
          <h2 className="font-semibold">{t('kit.title')}</h2>
          <div className="flex flex-wrap gap-2">
            <PendingDemo />
            <Button variant="secondary">{t('kit.secondary')}</Button>
            <Button variant="ghost">{t('kit.ghost')}</Button>
            <Button variant="ink">{t('kit.ink')}</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              ['neutral', 'primary', 'accent', 'success', 'warning', 'danger', 'info'] as const
            ).map((tone) => (
              <Badge key={tone} tone={tone}>
                {t(`kit.tones.${tone}`)}
              </Badge>
            ))}
          </div>
          <Field>
            <Label htmlFor="demo-email">{t('kit.field')}</Label>
            <Input
              id="demo-email"
              aria-invalid
              aria-describedby="demo-email-error"
              placeholder={t('kit.placeholder')}
            />
            <FieldError id="demo-email-error">{t('kit.error')}</FieldError>
          </Field>
          <div className="grid gap-2" aria-hidden>
            <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
          </div>
        </Card>
      </div>
    </div>
  );
}
