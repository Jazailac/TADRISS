import {
  getAnnouncementReach,
  listAnnouncements,
  listClasses,
  currentSchoolYear,
  type AnnouncementView,
} from '@tadriss/shared';
import { AlertCircle, Pin } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';
import { MarkAllReadButton } from './announcement-actions';
import { NewAnnouncementButton } from './announcement-dialog';
import type { Area } from './area';

export type AnnouncementsParams = { view?: string };
type View = 'active' | 'deleted';

export async function AnnouncementsPage({
  area,
  params,
}: {
  area: Area;
  params: AnnouncementsParams;
}) {
  const viewer = await getViewer();
  const tz = viewer?.profile.institution?.timezone ?? 'Africa/Casablanca';
  const userId = viewer?.session.userId ?? '';
  const isAdmin = area === 'dashboard';
  const canPublish = area === 'dashboard' || area === 'teacher';
  const view: View = params.view === 'deleted' && canPublish ? 'deleted' : 'active';
  const supabase = await getServerClient();

  const [t, shell, errors, f, list, classes] = await Promise.all([
    getTranslations('announcements'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    listAnnouncements(supabase, userId, { archived: view === 'deleted' }),
    canPublish ? listClasses(supabase, { schoolYear: currentSchoolYear() }) : null,
  ]);

  const head = (actions?: React.ReactNode) => (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow">{shell('communication')}</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
        <p className="mt-3 max-w-xl text-text-muted">{t(`subtitle.${isAdmin ? 'admin' : area}`)}</p>
      </div>
      {actions}
    </header>
  );

  if (!list.ok || (classes && !classes.ok)) {
    return (
      <div className="mx-auto grid grid-cols-1 max-w-4xl gap-7">
        {head()}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href={`/${area}/announcements`} variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  // Authors and the administration see how far each notice has reached.
  const reachable = list.data.filter((a) => isAdmin || a.authorId === userId).map((a) => a.id);
  const reach = await getAnnouncementReach(supabase, reachable);
  const unreadIds = list.data.filter((a) => !a.read).map((a) => a.id);
  const tabs: View[] = ['active', 'deleted'];

  return (
    <div className="mx-auto grid grid-cols-1 max-w-4xl gap-7">
      {head(
        canPublish ? (
          <NewAnnouncementButton
            area={area}
            schoolWide={isAdmin}
            classes={(classes?.ok ? classes.data : []).map((c) => ({ id: c.id, name: c.name }))}
          />
        ) : unreadIds.length > 0 ? (
          <MarkAllReadButton ids={unreadIds} />
        ) : undefined,
      )}

      {canPublish ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label={t('views.label')}
            className="flex w-fit gap-1 rounded-lg bg-surface-muted p-1"
          >
            {tabs.map((v) => (
              <Link
                key={v}
                href={{
                  pathname: `/${area}/announcements`,
                  query: v === 'active' ? {} : { view: v },
                }}
                aria-current={view === v ? 'page' : undefined}
                className={cx(
                  'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                  view === v ? 'bg-surface text-text shadow-xs' : 'text-text-muted hover:text-text',
                )}
              >
                {t(`views.${v}`)}
              </Link>
            ))}
          </nav>
          {view === 'active' && unreadIds.length > 0 ? <MarkAllReadButton ids={unreadIds} /> : null}
        </div>
      ) : null}

      {list.data.length === 0 ? (
        <Card>
          <EmptyState
            title={t(
              `empty.${view === 'deleted' ? 'deleted' : canPublish ? 'authored' : 'feed'}.title`,
            )}
            description={t(
              `empty.${view === 'deleted' ? 'deleted' : canPublish ? 'authored' : 'feed'}.body`,
            )}
          />
        </Card>
      ) : (
        <ul aria-label={t('card.list')} className="grid grid-cols-1 gap-3">
          {list.data.map((a) => (
            <AnnouncementRow
              key={a.id}
              a={a}
              area={area}
              reach={reach.ok ? reach.data.get(a.id) : undefined}
              t={t}
              date={f.dateTime(new Date(a.createdAt), {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: tz,
              })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

const n = (chunks: React.ReactNode) => <bdi>{chunks}</bdi>;

function AnnouncementRow({
  a,
  area,
  reach,
  t,
  date,
}: {
  a: AnnouncementView;
  area: Area;
  reach: { readCount: number; audienceCount: number } | undefined;
  t: Awaited<ReturnType<typeof getTranslations<'announcements'>>>;
  date: string;
}) {
  return (
    <li>
      <Link
        href={`/${area}/announcements/${a.id}`}
        aria-label={`${t('card.open')} : ${a.title}`}
        className={cx(
          'relative grid gap-2 rounded-xl border bg-surface p-4 shadow-sm transition-[box-shadow,border-color] hover:border-border-strong hover:shadow-md sm:px-5',
          a.read ? 'border-border' : 'border-primary/40',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          {a.read ? null : (
            <Badge tone="primary" dot>
              {t('card.unread')}
            </Badge>
          )}
          {a.pinned ? (
            <Badge tone="accent">
              <Pin className="size-3" aria-hidden />
              {t('card.pinned')}
            </Badge>
          ) : null}
          <Badge>
            {a.audience === 'class'
              ? t.rich('audience.class', { name: a.className ?? '', n })
              : t(`audience.${a.audience}`)}
          </Badge>
          <span className="ms-auto font-mono text-xs tabular-nums text-text-muted">{date}</span>
        </div>
        <p className={cx('text-lg', a.read ? 'font-medium' : 'font-semibold')} dir="auto">
          <bdi>{a.title}</bdi>
        </p>
        <p className="line-clamp-2 whitespace-pre-line text-sm text-text-muted" dir="auto">
          {a.body}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
          <span>{t.rich('card.by', { name: a.authorName, n })}</span>
          {reach ? (
            <span className="font-mono tabular-nums">
              {t('card.reach', { read: reach.readCount, total: reach.audienceCount })}
            </span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
