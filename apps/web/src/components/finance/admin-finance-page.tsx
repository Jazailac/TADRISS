import {
  addDays,
  currentSchoolYear,
  FINANCE_PAGE_SIZE,
  formatMoney,
  getFinanceSummary,
  invoiceStatus,
  invoiceStatuses,
  listClasses,
  listFeePlans,
  listInvoices,
  todayIn,
  type InvoiceStatus,
  type InvoiceView,
} from '@tadriss/shared';
import { AlertCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';
import { Input } from '../ui/field';
import { Meter } from '../ui/meter';
import { FeePlansButton } from './fee-plans-dialog';
import { GenerateInvoicesButton, NewInvoiceButton } from './invoice-dialogs';
import { StatusBadge } from './status-badge';

export type AdminFinanceParams = { status?: string; q?: string; page?: string };

const parseStatus = (s?: string): InvoiceStatus | 'all' =>
  (invoiceStatuses as readonly string[]).includes(s ?? '') ? (s as InvoiceStatus) : 'all';

export async function AdminFinancePage({ params }: { params: AdminFinanceParams }) {
  const viewer = await getViewer();
  const today = todayIn(viewer?.profile.institution?.timezone ?? 'Africa/Casablanca');
  const status = parseStatus(params.status);
  const q = (params.q ?? '').slice(0, 80);
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const supabase = await getServerClient();

  const [t, shell, errors, f, locale, summary, invoices, plans, classes] = await Promise.all([
    getTranslations('finance'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    getLocale(),
    getFinanceSummary(supabase, today),
    listInvoices(supabase, { status, q, today, page }),
    listFeePlans(supabase, { includeArchived: true }),
    listClasses(supabase, { schoolYear: currentSchoolYear() }),
  ]);
  const money = (c: number) => formatMoney(c, locale);

  const head = (actions?: React.ReactNode) => (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow">{shell('daily')}</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
        <p className="mt-3 max-w-xl text-text-muted">{t('subtitle.admin')}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );

  if (!summary.ok || !invoices.ok || !plans.ok || !classes.ok) {
    return (
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-7">
        {head()}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href="/dashboard/finance" variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const s = summary.data;
  const { rows, total, pageSize } = invoices.data;
  const filtering = status !== 'all' || q !== '';
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const link = (next: { status?: string; q?: string; page?: number }) => {
    const query: Record<string, string> = {};
    const ns = next.status ?? status;
    const nq = next.q ?? q;
    if (ns !== 'all') query.status = ns;
    if (nq) query.q = nq;
    if (next.page && next.page > 1) query.page = String(next.page);
    return { pathname: '/dashboard/finance', query };
  };
  const cards = [
    { key: 'billed', value: money(s.billedCentimes), tone: '' },
    { key: 'collected', value: money(s.collectedCentimes), tone: 'text-success' },
    { key: 'outstanding', value: money(s.outstandingCentimes), tone: '' },
    {
      key: 'overdue',
      value: money(s.overdueCentimes),
      tone: s.overdueCentimes > 0 ? 'text-danger' : '',
      sub: t('summary.overdueCount', { count: s.overdueInvoices }),
    },
  ] as const;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-7">
      {head(
        <>
          <FeePlansButton plans={plans.data} />
          <GenerateInvoicesButton
            plans={plans.data}
            classes={classes.data.map((c) => ({ id: c.id, name: c.name }))}
            defaultDueDate={addDays(today, 7)}
          />
          <NewInvoiceButton defaultDueDate={addDays(today, 7)} />
        </>,
      )}

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.key} className="p-5">
            <dt className="text-sm text-text-muted">{t(`summary.${c.key}`)}</dt>
            <dd className={cx('mt-2 font-mono text-2xl font-medium tabular-nums', c.tone)}>
              {c.value}
            </dd>
            {'sub' in c ? <p className="mt-1 text-xs text-text-muted">{c.sub}</p> : null}
          </Card>
        ))}
      </dl>
      <p className="-mt-3 text-xs text-text-muted">{t('summary.help')}</p>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4 sm:px-5">
          <form role="search" method="get" className="flex min-w-0 flex-1 basis-64 gap-2">
            {status !== 'all' ? <input type="hidden" name="status" value={status} /> : null}
            <div className="min-w-0 flex-1">
              <label htmlFor="finance-q" className="sr-only">
                {t('filters.search')}
              </label>
              <Input
                id="finance-q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder={t('filters.placeholder')}
                autoComplete="off"
                icon={<Search className="size-4" aria-hidden />}
                className="h-10"
              />
            </div>
            <button
              type="submit"
              className="h-10 shrink-0 rounded-md px-3 text-sm font-medium text-primary hover:bg-primary-soft"
            >
              {t('filters.apply')}
            </button>
          </form>
          <nav
            aria-label={t('filters.status')}
            className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-surface-muted p-1"
          >
            {(['all', ...invoiceStatuses] as const).map((x) => (
              <Link
                key={x}
                href={link({ status: x, page: 1 })}
                aria-current={status === x ? 'page' : undefined}
                className={cx(
                  'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  status === x
                    ? 'bg-surface text-text shadow-xs'
                    : 'text-text-muted hover:text-text',
                )}
              >
                {x === 'all' ? t('filters.all') : t(`status.${x}`)}
              </Link>
            ))}
          </nav>
        </div>

        {rows.length === 0 ? (
          filtering ? (
            <EmptyState
              title={t('list.noResults.title')}
              description={t('list.noResults.body')}
              action={
                <ButtonLink href="/dashboard/finance" variant="secondary">
                  {t('list.noResults.clear')}
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState title={t('list.empty.title')} description={t('list.empty.body')} />
          )
        ) : (
          <ul aria-label={t('list.label')} className="divide-y divide-border">
            {rows.map((i) => (
              <InvoiceRow key={i.id} invoice={i} today={today} money={money} f={f} t={t} />
            ))}
          </ul>
        )}

        {total > pageSize ? (
          <nav
            aria-label={t('pagination.label')}
            className="flex items-center justify-between gap-3 border-t border-border p-4 sm:px-5"
          >
            <p className="font-mono text-xs text-text-muted">
              {t('pagination.range', {
                from: (page - 1) * FINANCE_PAGE_SIZE + 1,
                to: Math.min(page * FINANCE_PAGE_SIZE, total),
                total,
              })}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={link({ page: page - 1 })}
                  rel="prev"
                  className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium ring-1 ring-inset ring-border-strong/70 hover:bg-surface-muted"
                >
                  <ChevronLeft className="rtl-flip size-4" aria-hidden />
                  {t('pagination.previous')}
                </Link>
              ) : null}
              {page < lastPage ? (
                <Link
                  href={link({ page: page + 1 })}
                  rel="next"
                  className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium ring-1 ring-inset ring-border-strong/70 hover:bg-surface-muted"
                >
                  {t('pagination.next')}
                  <ChevronRight className="rtl-flip size-4" aria-hidden />
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </Card>
    </div>
  );
}

function InvoiceRow({
  invoice: i,
  today,
  money,
  f,
  t,
}: {
  invoice: InvoiceView;
  today: string;
  money: (c: number) => string;
  f: Awaited<ReturnType<typeof getFormatter>>;
  t: Awaited<ReturnType<typeof getTranslations<'finance'>>>;
}) {
  const status = invoiceStatus(i, today);
  return (
    <li>
      <Link
        href={`/dashboard/finance/${i.id}`}
        className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5 transition-colors hover:bg-surface-muted/60 sm:px-5"
      >
        <span className="w-28 shrink-0 font-mono text-xs tabular-nums text-text-muted">
          {i.number}
        </span>
        <div className="min-w-0 flex-1 basis-48">
          <p className="truncate font-medium">
            <bdi>{i.studentName}</bdi>
          </p>
          <p className="truncate text-sm text-text-muted">
            <bdi>{i.description}</bdi>
            {' · '}
            {t('row.due', {
              date: f.dateTime(new Date(`${i.dueDate}T12:00:00Z`), {
                dateStyle: 'medium',
                timeZone: 'UTC',
              }),
            })}
          </p>
        </div>
        <div className="w-full min-w-0 sm:w-44">
          <p className="font-mono text-sm tabular-nums">
            {t('row.paidOf', { paid: money(i.paidCentimes), total: money(i.amountCentimes) })}
          </p>
          {status !== 'void' ? (
            <Meter
              value={i.paidCentimes}
              max={i.amountCentimes}
              tone="neutral"
              label={t('detail.paid')}
              className="mt-1.5"
            />
          ) : null}
        </div>
        <StatusBadge status={status} />
      </Link>
    </li>
  );
}
