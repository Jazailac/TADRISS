import { formatMoney, getInvoice, invoiceStatus, todayIn } from '@tadriss/shared';
import { ArrowLeft, FileText } from 'lucide-react';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { Meter } from '../ui/meter';
import { RecordPaymentButton, VoidButton } from './payment-dialogs';
import { StatusBadge } from './status-badge';

/** One invoice for the administration: amounts, payments with receipts, and the void controls. */
export async function InvoiceDetailPage({ id }: { id: string }) {
  const viewer = await getViewer();
  const today = todayIn(viewer?.profile.institution?.timezone ?? 'Africa/Casablanca');
  const supabase = await getServerClient();
  const [t, pm, f, locale, res] = await Promise.all([
    getTranslations('finance'),
    getTranslations('finance.payment.methods'),
    getFormatter(),
    getLocale(),
    getInvoice(supabase, id),
  ]);
  if (!res.ok) notFound();

  const { invoice: i, payments } = res.data;
  const money = (c: number) => formatMoney(c, locale);
  const date = (iso: string) =>
    f.dateTime(new Date(`${iso}T12:00:00Z`), { dateStyle: 'medium', timeZone: 'UTC' });
  const status = invoiceStatus(i, today);
  const livePayments = payments.filter((p) => !p.voided);

  const stats = [
    { key: 'amount', value: money(i.amountCentimes), tone: '' },
    { key: 'paid', value: money(i.paidCentimes), tone: 'text-success' },
    {
      key: 'balance',
      value: money(i.balanceCentimes),
      tone: i.balanceCentimes > 0 && status === 'overdue' ? 'text-danger' : '',
    },
  ] as const;

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-7">
      <Link
        href="/dashboard/finance"
        className="inline-flex w-fit items-center gap-2 text-sm text-text-muted hover:text-primary"
      >
        <ArrowLeft className="rtl-flip size-4" aria-hidden />
        {t('detail.back')}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm tabular-nums text-text-muted">{i.number}</span>
            <StatusBadge status={status} />
          </div>
          <h1 className="display mt-3 text-3xl md:text-4xl">
            <bdi>{i.description}</bdi>
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            <bdi>{i.studentName}</bdi>
            {' · '}
            {t('detail.issuedOn', { date: date(i.issuedOn) })}
            {' · '}
            {t('detail.dueOn', { date: date(i.dueDate) })}
          </p>
        </div>
        {!i.voided ? (
          <div className="flex flex-wrap items-center gap-2">
            <RecordPaymentButton
              invoiceId={i.id}
              balanceCentimes={i.balanceCentimes}
              today={today}
            />
            {livePayments.length === 0 ? <VoidButton kind="invoice" id={i.id} /> : null}
          </div>
        ) : null}
      </header>

      {i.voided ? (
        <p role="note" className="rounded-lg bg-warning-soft p-4 text-sm text-warning">
          {t('detail.voidedInvoice', { reason: i.voidReason ?? '' })}
        </p>
      ) : null}

      <dl className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.key} className="p-5">
            <dt className="text-sm text-text-muted">{t(`detail.${s.key}`)}</dt>
            <dd className={cx('mt-2 font-mono text-2xl font-medium tabular-nums', s.tone)}>
              {s.value}
            </dd>
          </Card>
        ))}
      </dl>
      {!i.voided ? (
        <Meter
          value={i.paidCentimes}
          max={i.amountCentimes}
          tone="neutral"
          label={t('detail.paid')}
          className="-mt-3"
        />
      ) : null}

      <Card className="overflow-hidden">
        <div className="border-b border-border p-5 sm:px-6">
          <h2 className="font-semibold">{t('detail.payments')}</h2>
        </div>
        {payments.length === 0 ? (
          <p className="p-6 text-sm text-text-muted">{t('detail.noPayments')}</p>
        ) : (
          <ul aria-label={t('detail.list')} className="divide-y divide-border">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5 sm:px-6"
              >
                <span
                  className={cx(
                    'w-28 shrink-0 font-mono text-xs tabular-nums',
                    p.voided ? 'text-text-muted line-through' : 'text-text-muted',
                  )}
                >
                  {p.receiptNumber}
                </span>
                <div className="min-w-0 flex-1 basis-44">
                  <p
                    className={cx(
                      'font-mono tabular-nums',
                      p.voided && 'text-text-muted line-through',
                    )}
                  >
                    {money(p.amountCentimes)}
                  </p>
                  <p className="text-sm text-text-muted">
                    {date(p.paidOn)} · {pm(p.method)}
                    {p.reference ? ` · ${t('detail.ref', { reference: p.reference })}` : ''}
                  </p>
                  {p.voided ? (
                    <p className="mt-1 text-sm text-warning">
                      {t('detail.voidedPayment', { reason: p.voidReason ?? '' })}
                    </p>
                  ) : null}
                </div>
                {p.voided ? <Badge tone="warning">{t('status.void')}</Badge> : null}
                <Link
                  href={`/receipt/${p.id}`}
                  target="_blank"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-primary hover:bg-primary-soft"
                >
                  <FileText className="size-4" aria-hidden />
                  {t('actions.receipt')}
                </Link>
                {!p.voided && !i.voided ? (
                  <VoidButton kind="payment" id={p.id} receipt={p.receiptNumber} compact />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
