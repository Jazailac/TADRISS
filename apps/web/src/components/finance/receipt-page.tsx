import { formatMoney, getReceipt } from '@tadriss/shared';
import { ArrowLeft } from 'lucide-react';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { Logo } from '../ui/logo';
import { PrintButton } from './print-button';

/** A printable receipt. RLS lets only the administration and the paying student read it. */
export async function ReceiptPage({ paymentId }: { paymentId: string }) {
  const viewer = await getViewer();
  const supabase = await getServerClient();
  const [t, pm, f, locale, res] = await Promise.all([
    getTranslations('finance.receipt'),
    getTranslations('finance.payment.methods'),
    getFormatter(),
    getLocale(),
    getReceipt(supabase, paymentId),
  ]);
  if (!res.ok) notFound();

  const r = res.data;
  const money = (c: number) => formatMoney(c, locale);
  const back = viewer?.session.role === 'student' ? '/student/payments' : '/dashboard/finance';
  const rows: [string, string][] = [
    [
      t('date'),
      f.dateTime(new Date(`${r.paidOn}T12:00:00Z`), { dateStyle: 'long', timeZone: 'UTC' }),
    ],
    [t('student'), r.studentName],
    [t('invoice'), r.invoiceNumber],
    [t('for'), r.invoiceDescription],
    [t('method'), pm(r.method)],
    ...(r.reference ? ([[t('reference'), r.reference]] as [string, string][]) : []),
  ];

  return (
    <main className="mx-auto grid max-w-2xl grid-cols-1 gap-5 px-4 py-8 print:max-w-none print:p-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href={back}
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary"
        >
          <ArrowLeft className="rtl-flip size-4" aria-hidden />
          {t('back')}
        </Link>
        <PrintButton />
      </div>

      <article
        aria-label={t('title')}
        className="relative overflow-hidden rounded-2xl border border-border bg-surface p-8 shadow-md print:rounded-none print:border-0 print:p-0 print:shadow-none"
      >
        {r.voided ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 grid place-items-center text-7xl font-black tracking-widest text-danger/15 -rotate-12"
          >
            {t('voided')}
          </span>
        ) : null}

        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <Logo />
            <p className="mt-3 font-semibold">
              <bdi>{r.institutionName}</bdi>
            </p>
          </div>
          <div className="text-end">
            <h1 className="display text-3xl">{t('title')}</h1>
            <p className="mt-1 font-mono text-sm tabular-nums text-text-muted">
              {t('number', { number: r.receiptNumber })}
            </p>
          </div>
        </header>

        <dl className="mt-6 grid gap-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[10rem_1fr] gap-4">
              <dt className="text-text-muted">{label}</dt>
              <dd className="font-medium">
                <bdi>{value}</bdi>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 rounded-xl bg-surface-muted p-6 print:border print:border-border print:bg-transparent">
          <p className="text-sm text-text-muted">{t('amount')}</p>
          <p className="mt-1 font-mono text-4xl font-medium tabular-nums">
            {money(r.amountCentimes)}
          </p>
          <p className="mt-3 text-sm text-text-muted">
            {r.balanceCentimes > 0 ? `${t('balance')} : ${money(r.balanceCentimes)}` : t('settled')}
          </p>
        </div>

        {r.voided ? (
          <p className="mt-4 text-sm font-medium text-danger">
            {t('voidedReason', { reason: r.voidReason ?? '' })}
          </p>
        ) : null}

        <footer className="mt-12 flex items-end justify-between gap-6 text-xs text-text-muted">
          <p>{t('footer')}</p>
          <p className="w-48 border-t border-border-strong pt-2 text-center">{t('signature')}</p>
        </footer>
      </article>
    </main>
  );
}
