import {
  countPeople,
  listOpenInvitations,
  listPeople,
  type MemberRole,
  type PeopleStatus,
  type Person,
} from '@tadriss/shared';
import { AlertCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';
import { Input } from '../ui/field';
import { InvitationActions } from './invitation-actions';
import { InviteDialog } from './invite-dialog';
import { MemberActions } from './member-actions';

export type PeopleSearchParams = { q?: string; status?: string; page?: string };

const parseStatus = (s?: string): PeopleStatus => (s === 'active' || s === 'inactive' ? s : 'all');
const parsePage = (p?: string) => {
  const n = Number.parseInt(p ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10_000) : 1;
};

/** Teachers and students share one screen: the role is the only difference. */
export async function PeoplePage({
  role,
  basePath,
  params,
}: {
  role: MemberRole;
  basePath: string;
  params: PeopleSearchParams;
}) {
  const status = parseStatus(params.status);
  const page = parsePage(params.page);
  const q = (params.q ?? '').slice(0, 80);

  const supabase = await getServerClient();
  const [t, shell, f, people, counts, invitations] = await Promise.all([
    getTranslations('people'),
    getTranslations('shell.groups'),
    getFormatter(),
    listPeople(supabase, { role, status, q, page }),
    countPeople(supabase, role),
    listOpenInvitations(supabase, role),
  ]);

  const href = (next: { q?: string; status?: PeopleStatus; page?: number }) => {
    const query: Record<string, string> = {};
    const nq = next.q ?? q;
    const ns = next.status ?? status;
    if (nq) query.q = nq;
    if (ns !== 'all') query.status = ns;
    if (next.page && next.page > 1) query.page = String(next.page);
    return { pathname: basePath, query };
  };

  const header = (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow">{shell('school')}</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">{t(`title.${role}`)}</h1>
        <p className="mt-3 max-w-xl text-text-muted">{t(`subtitle.${role}`)}</p>
      </div>
      <InviteDialog role={role} />
    </header>
  );

  if (!people.ok || !counts.ok || !invitations.ok) {
    return (
      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-7">
        {header}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href={href({})} variant="secondary" className="mt-2">
            {(await getTranslations('errors'))('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const { rows, total, pageSize } = people.data;
  const filtering = q !== '' || status !== 'all';
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const stats = [
    { key: 'active', value: counts.data.active },
    { key: 'inactive', value: counts.data.inactive },
    { key: 'invited', value: counts.data.invited },
  ] as const;

  return (
    <div className="mx-auto grid grid-cols-1 max-w-6xl gap-7">
      {header}

      <dl className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.key} className="p-5">
            <dt className="text-sm text-text-muted">{t(`stats.${s.key}`)}</dt>
            <dd className="mt-2 font-mono text-3xl font-medium tabular-nums">
              {f.number(s.value)}
            </dd>
          </Card>
        ))}
      </dl>

      {invitations.data.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="border-b border-border p-5 sm:px-6">
            <h2 className="font-semibold">{t('invitations.title')}</h2>
            <p className="mt-1 text-sm text-text-muted">{t('invitations.subtitle')}</p>
          </div>
          <ul className="divide-y divide-border">
            {invitations.data.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 sm:px-6"
              >
                <Avatar first={inv.firstName} last={inv.lastName} seed={inv.id} />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate font-medium">
                    <bdi>
                      {inv.firstName} {inv.lastName}
                    </bdi>
                  </p>
                  <p className="truncate text-sm text-text-muted">
                    {t.rich('invitations.sentTo', {
                      email: inv.email,
                      e: (chunks) => <bdi>{chunks}</bdi>,
                    })}
                  </p>
                </div>
                {inv.state === 'expired' ? (
                  <Badge tone="warning" dot>
                    {t('invitations.expired')}
                  </Badge>
                ) : (
                  <Badge tone="info">
                    {t('invitations.expires', {
                      date: f.dateTime(new Date(inv.expiresAt), { dateStyle: 'medium' }),
                    })}
                  </Badge>
                )}
                <InvitationActions id={inv.id} email={inv.email} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4 sm:px-5">
          <form role="search" method="get" className="flex min-w-0 flex-1 basis-64 gap-2">
            {status !== 'all' ? <input type="hidden" name="status" value={status} /> : null}
            <div className="min-w-0 flex-1">
              <label htmlFor="people-q" className="sr-only">
                {t('search.label')}
              </label>
              <Input
                id="people-q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder={t('search.placeholder')}
                autoComplete="off"
                icon={<Search className="size-4" aria-hidden />}
                className="h-10"
              />
            </div>
            <button
              type="submit"
              className="h-10 shrink-0 rounded-md px-3 text-sm font-medium text-primary hover:bg-primary-soft"
            >
              {t('search.submit')}
            </button>
          </form>
          <nav
            aria-label={t('filters.label')}
            className="flex gap-1 rounded-lg bg-surface-muted p-1"
          >
            {(['all', 'active', 'inactive'] as const).map((s) => (
              <Link
                key={s}
                href={href({ status: s, page: 1 })}
                aria-current={status === s ? 'page' : undefined}
                className={cx(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  status === s
                    ? 'bg-surface text-text shadow-xs'
                    : 'text-text-muted hover:text-text',
                )}
              >
                {t(`filters.${s}`)}
              </Link>
            ))}
          </nav>
        </div>

        {rows.length === 0 ? (
          filtering ? (
            <EmptyState
              title={t('noResults.title')}
              description={t('noResults.body')}
              action={
                <ButtonLink href={{ pathname: basePath }} variant="secondary">
                  {t('noResults.clear')}
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState title={t(`empty.${role}.title`)} description={t(`empty.${role}.body`)} />
          )
        ) : (
          <ul aria-label={t(`list.label.${role}`)} className="divide-y divide-border">
            {rows.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                statusLabel={t(
                  `status.${p.invited ? 'invited' : p.isActive ? 'active' : 'inactive'}`,
                )}
                noEmail={t('list.noEmail')}
              />
            ))}
          </ul>
        )}

        {total > pageSize ? (
          <nav
            aria-label={t('pagination.label')}
            className="flex items-center justify-between gap-3 border-t border-border p-4 sm:px-5"
          >
            <p className="font-mono text-xs text-text-muted">
              {t('pagination.range', { from, to, total })}
            </p>
            <div className="flex gap-2">
              <PageLink
                disabled={page <= 1}
                href={href({ page: page - 1 })}
                label={t('pagination.previous')}
                dir="prev"
              />
              <PageLink
                disabled={page >= lastPage}
                href={href({ page: page + 1 })}
                label={t('pagination.next')}
                dir="next"
              />
            </div>
          </nav>
        ) : null}
      </Card>
    </div>
  );
}

function PersonRow({
  person,
  statusLabel,
  noEmail,
}: {
  person: Person;
  statusLabel: string;
  noEmail: string;
}) {
  const tone = person.invited ? 'info' : person.isActive ? 'success' : 'neutral';
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5">
      <Avatar first={person.firstName} last={person.lastName} seed={person.id} />
      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate font-medium">
          <bdi>
            {person.firstName} {person.lastName}
          </bdi>
        </p>
        <p className="truncate text-sm text-text-muted">
          {person.email ? <bdi>{person.email}</bdi> : noEmail}
        </p>
      </div>
      <Badge tone={tone} dot>
        {statusLabel}
      </Badge>
      {person.invited ? null : <MemberActions person={person} />}
    </li>
  );
}

function PageLink({
  href,
  label,
  dir,
  disabled,
}: {
  href: { pathname: string; query: Record<string, string> };
  label: string;
  dir: 'prev' | 'next';
  disabled: boolean;
}) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  const cls =
    'inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium ring-1 ring-inset ring-border-strong/70';
  const inner = (
    <>
      {dir === 'prev' ? <Icon className="rtl-flip size-4" aria-hidden /> : null}
      {label}
      {dir === 'next' ? <Icon className="rtl-flip size-4" aria-hidden /> : null}
    </>
  );
  return disabled ? (
    <span aria-disabled="true" className={cx(cls, 'pointer-events-none opacity-50')}>
      {inner}
    </span>
  ) : (
    <Link href={href} rel={dir} className={cx(cls, 'hover:bg-surface-muted')}>
      {inner}
    </Link>
  );
}
