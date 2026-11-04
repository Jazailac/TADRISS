import {
  getDayLessons,
  getUnreadCounts,
  listAnnouncements,
  listHomework,
  todayIn,
} from '@tadriss/shared';
import { ClipboardList, MessageSquare } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getDisabledModules } from '@/lib/modules';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { Badge } from '../ui/badge';
import { AnnouncementsLatest } from './announcements-latest';
import { bdi, EmptyLine, Panel, StatTile } from './dash-parts';
import { LessonsToday } from './lessons-today';
import { DayCover } from './day-cover';

/** A teacher's home: today's lessons and roll calls, homework to follow, and what's new. */
export async function TeacherHome() {
  const viewer = await getViewer();
  const tz = viewer?.profile.institution?.timezone ?? 'Africa/Casablanca';
  const userId = viewer?.session.userId ?? '';
  const today = todayIn(tz);
  const supabase = await getServerClient();
  const [t, app, w, off, lessons, homework, announcements, unread] = await Promise.all([
    getTranslations('dashboard'),
    getTranslations('app'),
    getTranslations('workspace'),
    getDisabledModules(),
    getDayLessons(supabase, { date: today, teacherId: userId }),
    listHomework(supabase, { teacherId: userId }),
    listAnnouncements(supabase, userId, { limit: 4 }),
    getUnreadCounts(supabase),
  ]);

  const dayLessons = lessons.ok ? lessons.data : [];
  const toTake = dayLessons.filter((l) => !l.taken).length;
  const pending = (homework.ok ? homework.data : []).filter((h) => h.dueDate >= today);
  const upcoming = pending.slice(0, 4);
  const showDay = !off.includes('attendance') || !off.includes('schedule');
  const dayHref = off.includes('attendance') ? '/teacher/schedule' : '/teacher/attendance';
  const metricCount =
    Number(showDay) + Number(!off.includes('homework')) + Number(!off.includes('messages'));

  return (
    <div className="dashboard-page mx-auto grid w-full grid-cols-1 max-w-6xl gap-7">
      <DayCover
        title={app.rich('greeting', { name: viewer?.profile.firstName ?? '', n: bdi })}
        subtitle={t('teacher.subtitle')}
        date={today}
        focusLabel={
          showDay
            ? !off.includes('attendance')
              ? t('admin.rollCalls')
              : w('lessonFocus')
            : w('focus')
        }
        focusValue={
          showDay && lessons.ok
            ? !off.includes('attendance') && dayLessons.length > 0
              ? `${dayLessons.length - toTake}/${dayLessons.length}`
              : dayLessons.length
            : '–'
        }
        focusHint={
          showDay && lessons.ok
            ? dayLessons.length > 0
              ? w('teacherHint')
              : t('teacher.noLessons')
            : w('inStep')
        }
        focusHref={showDay ? dayHref : undefined}
        progress={
          showDay && !off.includes('attendance') && dayLessons.length > 0
            ? (dayLessons.length - toTake) / dayLessons.length
            : undefined
        }
      />

      {metricCount > 0 ? (
        <div
          className="metric-strip metric-strip-compact dashboard-metrics grid"
          style={{ gridTemplateColumns: `repeat(${metricCount}, minmax(0, 1fr))` }}
        >
          <dl className="contents">
            {showDay ? (
              <StatTile
                icon={ClipboardList}
                label={t('teacher.lessonsToday')}
                value={dayLessons.length}
                hint={
                  dayLessons.length > 0
                    ? !off.includes('attendance')
                      ? toTake > 0
                        ? t('teacher.toTake', { count: toTake })
                        : t('teacher.allTaken')
                      : undefined
                    : t('teacher.noLessons')
                }
                href={dayHref}
                tone={toTake > 0 ? 'warning' : 'success'}
              />
            ) : null}
            {!off.includes('homework') ? (
              <StatTile
                icon={ClipboardList}
                label={t('teacher.homeworkOpen')}
                value={pending.length}
                href="/teacher/homework"
                tone="accent"
              />
            ) : null}
            {!off.includes('messages') ? (
              <StatTile
                icon={MessageSquare}
                label={t('teacher.unreadMessages')}
                value={unread.messages}
                href="/teacher/messages"
                tone="info"
              />
            ) : null}
          </dl>
        </div>
      ) : null}

      <div className="day-layout">
        <div className="daybook-column">
          {!showDay ? null : (
            <Panel
              title={t('teacher.todayTitle')}
              href={dayHref}
              linkLabel={t('seeAll')}
              kind="schedule"
            >
              <LessonsToday
                lessons={dayLessons.map((l) => ({ slot: l.slot, taken: l.taken }))}
                base={off.includes('attendance') ? undefined : '/teacher/attendance'}
                date={today}
                showRollCall={!off.includes('attendance')}
              />
            </Panel>
          )}

          {off.includes('announcements') ? null : (
            <Panel
              title={t('teacher.newsTitle')}
              href="/teacher/announcements"
              linkLabel={t('seeAll')}
              kind="news"
            >
              <AnnouncementsLatest
                items={announcements.ok ? announcements.data : []}
                base="/teacher/announcements"
                timeZone={tz}
              />
            </Panel>
          )}
        </div>
        <div className="daybook-column">
          {off.includes('homework') ? null : (
            <Panel
              kind="tasks"
              title={t('teacher.homeworkTitle')}
              href="/teacher/homework"
              linkLabel={t('seeAll')}
            >
              {upcoming.length === 0 ? (
                <EmptyLine>{t('teacher.noHomework')}</EmptyLine>
              ) : (
                <ul className="grid grid-cols-1 divide-y divide-border">
                  {upcoming.map((h) => (
                    <li key={h.id} className="min-w-0">
                      <Link
                        href={`/teacher/homework/${h.id}`}
                        className="flex items-center gap-3 py-3 hover:text-primary"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium" dir="auto">
                            <bdi>{h.title}</bdi>
                          </span>
                          <span className="block truncate text-xs text-text-muted">
                            <bdi>{h.className}</bdi>
                          </span>
                        </span>
                        <Badge>{t('teacher.done', { count: h.doneCount })}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
