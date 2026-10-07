import { AlertCircle } from 'lucide-react';
import { FileText } from 'lucide-react';
import { formatMoney, invoiceStatus, listMyInvoices, todayIn } from '@tadriss/shared';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';
import { Meter } from '../ui/meter';
import { StatusBadge } from './status-badge';

/** A student's own invoices, what is still owed, and their receipts. */
export async function StudentPaymentsPage() {
  const viewer = await getViewer();
  const today = todayIn(viewer?.profile.institution?.timezone ?? 'Africa/Casablanca');
  const supabase = await getServerClient();
  const [t, pm, shell, errors, f, locale, res] = await Promise.all([
    getTranslations('finance'),
    getTranslations('finance.payment.methods'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    getLocale(),
    listMyInvoices(supabase),
  ]);
  const money = (c: number) => formatMoney(c, locale);
  const date = (iso: string) =>
    f.dateTime(new Date(`${iso}T12:00:00Z`), { dateStyle: 'medium', timeZone: 'UTC' });

  const head = (
    <header>
      <p className="eyebrow">{shell('daily')}</p>
      <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
      <p className="mt-3 max-w-xl text-text-muted">{t('subtitle.student')}</p>
    </header>
  );

  if (!res.ok) {
    return (
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-7">
        {head}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href="/student/payments" variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const owed = res.data.reduce((sum, i) => sum + i.balanceCentimes, 0);
  const paid = res.data.reduce((sum, i) => sum + i.paidCentimes, 0);

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-7">
      {head}
      {res.data.length === 0 ? (
        <Card>
          <EmptyState title={t('student.empty.title')} description={t('student.empty.body')} />
        </Card>
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <dt className="text-sm text-text-muted">{t('student.owed')}</dt>
              <dd
                className={cx(
                  'mt-2 font-mono text-3xl font-medium tabular-nums',
                  owed > 0 ? '' : 'text-success',
                )}
              >
                {money(owed)}
              </dd>
              {owed === 0 ? (
                <p className="mt-1 text-xs text-success">{t('student.allPaid')}</p>
              ) : null}
            </Card>
            <Card className="p-5">
              <dt className="text-sm text-text-muted">{t('student.paid')}</dt>
              <dd className="mt-2 font-mono text-3xl font-medium tabular-nums">{money(paid)}</dd>
            </Card>
          </dl>

          <ul aria-label={t('student.list')} className="grid gap-4">
            {res.data.map((i) => {
              const status = invoiceStatus(i, today);
              return (
                <li key={i.id}>
                  <Card className="overflow-hidden">
                    <div className="grid gap-3 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs tabular-nums text-text-muted">
                          {i.number}
                        </span>
                        <StatusBadge status={status} />
                      </div>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="font-medium">
                          <bdi>{i.description}</bdi>
                        </h2>
                        <p className="font-mono tabular-nums">{money(i.amountCentimes)}</p>
                      </div>
                      <p className="text-sm text-text-muted">
                        {t('detail.dueOn', { date: date(i.dueDate) })}
                      </p>
                      <Meter
                        value={i.paidCentimes}
                        max={i.amountCentimes}
                        tone="neutral"
                        label={t('detail.paid')}
                      />
                      <p className="font-mono text-xs tabular-nums text-text-muted">
                        {t('row.paidOf', {
                          paid: money(i.paidCentimes),
                          total: money(i.amountCentimes),
                        })}
                      </p>
                    </div>
                    {i.payments.length > 0 ? (
                      <ul
                        aria-label={t('student.receipts')}
                        className="divide-y divide-border border-t border-border"
                      >
                        {i.payments.map((p) => (
                          <li
                            key={p.id}
                            className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3"
                          >
                            <span className="font-mono text-xs tabular-nums text-text-muted">
                              {p.receiptNumber}
                            </span>
                            <span className="flex-1 text-sm">
                              {money(p.amountCentimes)} · {date(p.paidOn)} · {pm(p.method)}
                            </span>
                            <Link
                              href={`/receipt/${p.id}`}
                              target="_blank"
                              className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-primary hover:bg-primary-soft"
                            >
                              <FileText className="size-4" aria-hidden />
                              {t('actions.receipt')}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
