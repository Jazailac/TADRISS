import {
  countPeople,
  currentSchoolYear,
  formatMoney,
  getDayLessons,
  getFinanceSummary,
  getPlanUsage,
  getUnreadCounts,
  listAnnouncements,
  listClasses,
  todayIn,
} from '@tadriss/shared';
import { BookOpen, CalendarCheck, GraduationCap, Megaphone, Users } from 'lucide-react';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Meter } from '../ui/meter';
import { AnnouncementsLatest } from './announcements-latest';
import { bdi, Panel, StatTile } from './dash-parts';
import { LessonsToday } from './lessons-today';

/** The administration's home: school head-counts, today's roll calls, money, and what's new. */
export async function AdminHome() {
  const viewer = await getViewer();
  const tz = viewer?.profile.institution?.timezone ?? 'Africa/Casablanca';
  const today = todayIn(tz);
  const supabase = await getServerClient();
  const [
    t,
    app,
    f,
    locale,
    students,
    teachers,
    classes,
    lessons,
    finance,
    plan,
    announcements,
    unread,
  ] = await Promise.all([
    getTranslations('dashboard'),
    getTranslations('app'),
    getFormatter(),
    getLocale(),
    countPeople(supabase, 'student'),
    countPeople(supabase, 'teacher'),
    listClasses(supabase, { schoolYear: currentSchoolYear() }),
    getDayLessons(supabase, { date: today }),
    getFinanceSummary(supabase, today),
    getPlanUsage(supabase),
    listAnnouncements(supabase, viewer?.session.userId ?? '', { limit: 4 }),
    getUnreadCounts(supabase),
  ]);

  const dayLessons = lessons.ok ? lessons.data : [];
  const rollCalls = dayLessons.filter((l) => l.taken).length;
  const fin = finance.ok ? finance.data : null;
  // A school that has nobody yet gets a starting point instead of a wall of zeros.
  const headcount = [students, teachers].reduce(
    (n, c) => n + (c.ok ? c.data.active + c.data.invited : 0),
    0,
  );
  const isNew = headcount === 0 && classes.ok && classes.data.length === 0;

  return (
    <div className="mx-auto grid grid-cols-1 max-w-6xl gap-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">
            {f.dateTime(new Date(), {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone: tz,
            })}
          </p>
          <h1 className="display mt-4 text-4xl md:text-5xl">
            {app.rich('greeting', { name: viewer?.profile.firstName ?? '', n: bdi })}
          </h1>
          <p className="mt-3 max-w-xl text-text-muted">{t('admin.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink
            href="/dashboard/announcements"
            variant="secondary"
            icon={<Megaphone className="size-4" aria-hidden />}
          >
            {t('admin.actions.announce')}
          </ButtonLink>
          <ButtonLink href="/dashboard/students">{t('admin.actions.invite')}</ButtonLink>
        </div>
      </header>

      {isNew ? (
        <Panel title={t('admin.startTitle')}>
          <p className="text-sm text-text-muted">{t('admin.startBody')}</p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-3">
            {(
              [
                ['teachers', '/dashboard/teachers'],
                ['students', '/dashboard/students'],
                ['classes', '/dashboard/classes'],
              ] as const
            ).map(([key, href], i) => (
              <li key={key}>
                <Link
                  href={href}
                  className="flex h-full items-center gap-3 rounded-xl border border-border p-4 text-sm font-medium hover:border-border-strong hover:bg-surface-muted"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft font-mono text-xs text-primary">
                    {i + 1}
                  </span>
                  {t(`admin.start.${key}`)}
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      ) : null}

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Users}
          label={t('admin.students')}
          value={students.ok ? students.data.active : '–'}
          hint={
            students.ok && students.data.invited > 0
              ? t('admin.invited', { count: students.data.invited })
              : undefined
          }
          href="/dashboard/students"
        />
        <StatTile
          icon={GraduationCap}
          label={t('admin.teachers')}
          value={teachers.ok ? teachers.data.active : '–'}
          hint={
            teachers.ok && teachers.data.invited > 0
              ? t('admin.invited', { count: teachers.data.invited })
              : undefined
          }
          href="/dashboard/teachers"
          tone="accent"
        />
        <StatTile
          icon={BookOpen}
          label={t('admin.classes')}
          value={classes.ok ? classes.data.length : '–'}
          href="/dashboard/classes"
          tone="info"
        />
        <StatTile
          icon={CalendarCheck}
          label={t('admin.rollCalls')}
          value={dayLessons.length === 0 ? '–' : `${rollCalls}/${dayLessons.length}`}
          hint={dayLessons.length === 0 ? t('admin.noLessons') : undefined}
          href="/dashboard/attendance"
          tone={dayLessons.length > 0 && rollCalls < dayLessons.length ? 'warning' : 'success'}
        />
      </dl>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          title={t('admin.todayTitle')}
          href="/dashboard/attendance"
          linkLabel={t('seeAll')}
          className="lg:col-span-2"
        >
          <LessonsToday
            lessons={dayLessons.map((l) => ({ slot: l.slot, taken: l.taken }))}
            showRollCall
            showTeacher
          />
        </Panel>

        <Panel title={t('admin.moneyTitle')} href="/dashboard/finance" linkLabel={t('seeAll')}>
          {fin ? (
            <dl className="grid gap-4">
              <div>
                <dt className="text-xs text-text-muted">{t('admin.collected')}</dt>
                <dd className="font-mono text-lg tabular-nums">
                  {formatMoney(fin.collectedCentimes, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">{t('admin.outstanding')}</dt>
                <dd className="font-mono text-lg tabular-nums">
                  {formatMoney(fin.outstandingCentimes, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">{t('admin.overdue')}</dt>
                <dd className="flex items-center gap-2 font-mono text-lg tabular-nums">
                  {formatMoney(fin.overdueCentimes, locale)}
                  {fin.overdueInvoices > 0 ? (
                    <Badge tone="danger">
                      {t('admin.overdueInvoices', { count: fin.overdueInvoices })}
                    </Badge>
                  ) : null}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-text-muted">{t('unavailable')}</p>
          )}
        </Panel>

        <Panel
          title={t('admin.newsTitle')}
          href="/dashboard/announcements"
          linkLabel={t('seeAll')}
          className="lg:col-span-2"
        >
          <AnnouncementsLatest
            items={announcements.ok ? announcements.data : []}
            base="/dashboard/announcements"
            timeZone={tz}
          />
        </Panel>

        <Panel
          title={t('admin.planTitle')}
          href="/dashboard/settings"
          linkLabel={t('admin.planLink')}
        >
          {plan.ok ? (
            <div className="grid gap-4">
              {(['students', 'teachers'] as const).map((k) => {
                const seat = plan.data[k];
                return (
                  <div key={k}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span>{t(`admin.${k}`)}</span>
                      <span className="font-mono tabular-nums text-text-muted">
                        {seat.limit === null ? seat.used : `${seat.used}/${seat.limit}`}
                      </span>
                    </div>
                    {seat.limit === null ? null : (
                      <Meter
                        value={seat.used}
                        max={seat.limit}
                        label={t(`admin.${k}`)}
                        className="mt-2"
                      />
                    )}
                  </div>
                );
              })}
              {unread.messages > 0 ? (
                <ButtonLink href="/dashboard/messages" variant="secondary" size="sm">
                  {t('admin.unreadMessages', { count: unread.messages })}
                </ButtonLink>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-text-muted">{t('unavailable')}</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
