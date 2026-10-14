import { listPlatformInstitutions, type PlatformInstitution } from '@tadriss/shared';
import { AlertCircle, Search } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';

export type InstitutionsParams = { q?: string; status?: string };
type Status = 'all' | 'active' | 'suspended';
const parseStatus = (v?: string): Status => (v === 'active' || v === 'suspended' ? v : 'all');

export async function InstitutionsPage({ params }: { params: InstitutionsParams }) {
  const supabase = await getServerClient();
  const [t, s, errors, f, list] = await Promise.all([
    getTranslations('platform'),
    getTranslations('settings.plan.names'),
    getTranslations('errors'),
    getFormatter(),
    listPlatformInstitutions(supabase),
  ]);
  const status = parseStatus(params.status);
  const q = (params.q ?? '').trim().toLocaleLowerCase();

  const head = (
    <header>
      <p className="eyebrow">{t('eyebrow')}</p>
      <h1 className="display mt-4 text-4xl md:text-5xl">{t('institutions.title')}</h1>
      <p className="mt-3 max-w-xl text-text-muted">{t('institutions.subtitle')}</p>
    </header>
  );

  if (!list.ok) {
    return (
      <div className="mx-auto grid grid-cols-1 max-w-5xl gap-7">
        {head}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href="/admin/institutions" variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const shown = list.data.filter(
    (i) =>
      (status === 'all' || (status === 'suspended') === i.suspended) &&
      (q === '' || i.name.toLocaleLowerCase().includes(q) || i.slug.includes(q)),
  );
  const tabs: Status[] = ['all', 'active', 'suspended'];

  return (
    <div className="mx-auto grid grid-cols-1 max-w-5xl gap-7">
      {head}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label={t('institutions.statusLabel')}
          className="flex w-fit gap-1 rounded-lg bg-surface-muted p-1"
        >
          {tabs.map((v) => (
            <Link
              key={v}
              href={{
                pathname: '/admin/institutions',
                query: { ...(v === 'all' ? {} : { status: v }), ...(q ? { q: params.q } : {}) },
              }}
              aria-current={status === v ? 'page' : undefined}
              className={cx(
                'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                status === v ? 'bg-surface text-text shadow-xs' : 'text-text-muted hover:text-text',
              )}
            >
              {t(`institutions.status.${v}`)}
            </Link>
          ))}
        </nav>
        <form role="search" className="relative w-full sm:w-72">
          {status === 'all' ? null : <input type="hidden" name="status" value={status} />}
          <Search
            className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-text-muted"
            aria-hidden
          />
          <input
            name="q"
            type="search"
            defaultValue={params.q ?? ''}
            aria-label={t('institutions.search')}
            placeholder={t('institutions.search')}
            dir="auto"
            className="h-11 w-full rounded-md border border-border bg-surface ps-9 pe-3 text-sm outline-none focus:border-primary"
          />
        </form>
      </div>

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            title={t('institutions.empty.title')}
            description={t('institutions.empty.body')}
          />
        </Card>
      ) : (
        <ul aria-label={t('institutions.list')} className="grid grid-cols-1 gap-3">
          {shown.map((i) => (
            <Row
              key={i.id}
              i={i}
              plan={s(i.plan)}
              t={t}
              date={f.dateTime(new Date(i.createdAt), { dateStyle: 'medium', timeZone: 'UTC' })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({
  i,
  plan,
  t,
  date,
}: {
  i: PlatformInstitution;
  plan: string;
  t: Awaited<ReturnType<typeof getTranslations<'platform'>>>;
  date: string;
}) {
  return (
    <li className="min-w-0">
      <Link
        href={`/admin/institutions/${i.id}`}
        className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm transition-[box-shadow,border-color] hover:border-border-strong hover:shadow-md sm:px-5"
      >
        <div className="min-w-0 flex-1 basis-56">
          <p className="truncate font-medium" dir="auto">
            <bdi>{i.name}</bdi>
          </p>
          <p className="truncate font-mono text-xs text-text-muted">{i.slug}</p>
        </div>
        <Badge tone="primary">{plan}</Badge>
        {i.suspended ? <Badge tone="danger">{t('institutions.suspended')}</Badge> : null}
        <span className="font-mono text-xs tabular-nums text-text-muted">
          {t('institutions.counts', { students: i.students, teachers: i.teachers })}
        </span>
        <span className="font-mono text-xs tabular-nums text-text-muted">{date}</span>
      </Link>
    </li>
  );
}
