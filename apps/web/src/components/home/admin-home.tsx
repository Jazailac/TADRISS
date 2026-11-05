import {
  countPeople,
  currentSchoolYear,
  formatMoney,
  getDayLessons,
  getFinanceSummary,
  getPlanUsage,
  listAnnouncements,
  listClasses,
  listOpenInvitations,
  listOverdueStudents,
  minuteOfDayIn,
  readUnreadCounts,
  todayIn,
} from '@tadriss/shared';
import { BookOpen, CalendarClock, GraduationCap, Megaphone, Users } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Meter } from '../ui/meter';
import { AnnouncementsLatest } from './announcements-latest';
import { bdi, Panel, StatTile } from './dash-parts';
import { LessonsToday } from './lessons-today';
import { DayCover } from './day-cover';
import { NeedsToday } from './needs-today';
import { CollectionInstrument } from './collection-instrument';

/** The administration's home: school head-counts, today's roll calls, money, and what's new. */
export async function AdminHome() {
  const viewer = await getViewer();
  const tz = viewer?.profile.institution?.timezone ?? 'Africa/Casablanca';
  const today = todayIn(tz);
  const supabase = await getServerClient();
  const [
    t,
    app,
    w,
    locale,
    students,
    teachers,
    classes,
    lessons,
    finance,
    plan,
    announcements,
    unread,
    overdue,
    ...invitations
  ] = await Promise.all([
    getTranslations('dashboard'),
    getTranslations('app'),
    getTranslations('workspace'),
    getLocale(),
    countPeople(supabase, 'student'),
    countPeople(supabase, 'teacher'),
    listClasses(supabase, { schoolYear: currentSchoolYear() }),
    getDayLessons(supabase, { date: today }),
    getFinanceSummary(supabase, today),
    getPlanUsage(supabase),
    listAnnouncements(supabase, viewer?.session.userId ?? '', { limit: 4 }),
    readUnreadCounts(supabase),
    listOverdueStudents(supabase, today),
    listOpenInvitations(supabase, 'student'),
    listOpenInvitations(supabase, 'teacher'),
    listOpenInvitations(supabase, 'parent'),
  ]);

  const dayLessons = lessons.ok ? lessons.data : [];
  const rollCalls = dayLessons.filter((l) => l.taken).length;
  const now = minuteOfDayIn(tz);
  const lateLessons = dayLessons.filter((l) => !l.taken && l.slot.endMin <= now);
  const expiredByPage = (['students', 'teachers', 'parents'] as const).map((page, i) => {
    const list = invitations[i];
    return {
      href: `/dashboard/${page}`,
      count: list?.ok ? list.data.filter((inv) => inv.state === 'expired').length : 0,
    };
  });
  const fin = finance.ok ? finance.data : null;
  // A school that has nobody yet gets a starting point instead of a wall of zeros.
  const headcount = [students, teachers].reduce(
    (n, c) => n + (c.ok ? c.data.active + c.data.invited : 0),
    0,
  );
  const isNew =
    students.ok && teachers.ok && headcount === 0 && classes.ok && classes.data.length === 0;

  return (
    <div className="dashboard-page mx-auto grid w-full grid-cols-1 max-w-6xl gap-7">
      <DayCover
        title={app.rich('greeting', { name: viewer?.profile.firstName ?? '', n: bdi })}
        subtitle={t('admin.subtitle')}
        date={today}
        focusLabel={t('admin.rollCalls')}
        focusValue={lessons.ok && dayLessons.length > 0 ? `${rollCalls}/${dayLessons.length}` : '–'}
        focusHint={
          lessons.ok
            ? dayLessons.length > 0
              ? w('rollCallStatus', {
                  todo: dayLessons.length - rollCalls,
                  late: lateLessons.length,
                })
              : t('admin.noLessons')
            : t('unavailable')
        }
        focusHref="/dashboard/attendance"
        progress={lessons.ok && dayLessons.length > 0 ? rollCalls / dayLessons.length : undefined}
        actions={
          <>
            <ButtonLink
              href="/dashboard/announcements"
              variant="secondary"
              icon={<Megaphone className="size-4" aria-hidden />}
            >
              {t('admin.actions.announce')}
            </ButtonLink>
            <ButtonLink href="/dashboard/students">{t('admin.actions.invite')}</ButtonLink>
          </>
        }
      />

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

      {isNew ? null : (
        <NeedsToday
          late={lateLessons}
          overdue={overdue.ok ? overdue.data : []}
          unreadMessages={unread.ok ? unread.data.messages : 0}
          today={today}
          classesWithoutTeacher={
            classes.ok ? classes.data.filter((c) => c.teachers.length === 0) : []
          }
          expiredInvitations={expiredByPage.reduce((n, page) => n + page.count, 0)}
          invitationsHref={
            expiredByPage.find((page) => page.count > 0)?.href ?? '/dashboard/students'
          }
          incomplete={[lessons, overdue, unread, classes, ...invitations].some((r) => !r.ok)}
        />
      )}

      <dl className="metric-strip dashboard-metrics dashboard-metrics-pairs grid grid-cols-2 lg:grid-cols-4">
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
          icon={CalendarClock}
          label={t('admin.overdue')}
          value={fin ? formatMoney(fin.overdueCentimes, locale) : '–'}
          hint={
            fin && fin.overdueInvoices > 0
              ? t('admin.overdueInvoices', { count: fin.overdueInvoices })
              : undefined
          }
          href="/dashboard/finance?status=overdue"
          tone={fin && fin.overdueCentimes > 0 ? 'danger' : 'success'}
        />
      </dl>

      <div className="day-layout">
        <div className="daybook-column">
          <Panel
            title={t('admin.todayTitle')}
            href="/dashboard/attendance"
            linkLabel={t('seeAll')}
            kind="schedule"
          >
            <LessonsToday
              lessons={dayLessons.map((l) => ({ slot: l.slot, taken: l.taken }))}
              base="/dashboard/attendance"
              date={today}
              showRollCall
              showTeacher
            />
          </Panel>

          <Panel
            title={t('admin.newsTitle')}
            href="/dashboard/announcements"
            linkLabel={t('seeAll')}
            kind="news"
          >
            <AnnouncementsLatest
              items={announcements.ok ? announcements.data : []}
              base="/dashboard/announcements"
              timeZone={tz}
            />
          </Panel>
        </div>
        <div className="daybook-column">
          <Panel
            title={t('admin.moneyTitle')}
            href="/dashboard/finance"
            linkLabel={t('seeAll')}
            kind="finance"
          >
            {fin ? (
              <>
                <CollectionInstrument
                  collected={fin.collectedCentimes}
                  outstanding={fin.outstandingCentimes}
                />
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
                    <dd className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-lg tabular-nums">
                      {formatMoney(fin.overdueCentimes, locale)}
                      {fin.overdueInvoices > 0 ? (
                        <Badge tone="danger">
                          {t('admin.overdueInvoices', { count: fin.overdueInvoices })}
                        </Badge>
                      ) : null}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="text-sm text-text-muted">{t('unavailable')}</p>
            )}
          </Panel>

          <Panel
            kind="usage"
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
              </div>
            ) : (
              <p className="text-sm text-text-muted">{t('unavailable')}</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
