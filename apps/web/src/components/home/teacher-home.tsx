import {
  getDayLessons,
  getUnreadCounts,
  listAnnouncements,
  listHomework,
  todayIn,
} from '@tadriss/shared';
import { ClipboardList, MessageSquare } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getDisabledModules } from '@/lib/modules';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { Badge } from '../ui/badge';
import { AnnouncementsLatest } from './announcements-latest';
import { bdi, EmptyLine, Panel, StatTile } from './dash-parts';
import { LessonsToday } from './lessons-today';

/** A teacher's home: today's lessons and roll calls, homework to follow, and what's new. */
export async function TeacherHome() {
  const viewer = await getViewer();
  const tz = viewer?.profile.institution?.timezone ?? 'Africa/Casablanca';
  const userId = viewer?.session.userId ?? '';
  const today = todayIn(tz);
  const supabase = await getServerClient();
  const [t, app, f, off, lessons, homework, announcements, unread] = await Promise.all([
    getTranslations('dashboard'),
    getTranslations('app'),
    getFormatter(),
    getDisabledModules(),
    getDayLessons(supabase, { date: today, teacherId: userId }),
    listHomework(supabase, { teacherId: userId }),
    listAnnouncements(supabase, userId, { limit: 4 }),
    getUnreadCounts(supabase),
  ]);

  const dayLessons = lessons.ok ? lessons.data : [];
  const toTake = dayLessons.filter((l) => !l.taken).length;
  const upcoming = (homework.ok ? homework.data : []).filter((h) => h.dueDate >= today).slice(0, 4);

  return (
    <div className="mx-auto grid grid-cols-1 max-w-6xl gap-7">
      <header>
        <p className="eyebrow">
          {f.dateTime(new Date(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz })}
        </p>
        <h1 className="display mt-4 text-4xl md:text-5xl">
          {app.rich('greeting', { name: viewer?.profile.firstName ?? '', n: bdi })}
        </h1>
        <p className="mt-3 max-w-xl text-text-muted">{t('teacher.subtitle')}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <dl className="contents">
          <StatTile
            icon={ClipboardList}
            label={t('teacher.lessonsToday')}
            value={dayLessons.length}
            hint={
              dayLessons.length > 0
                ? toTake > 0
                  ? t('teacher.toTake', { count: toTake })
                  : t('teacher.allTaken')
                : t('teacher.noLessons')
            }
            href="/teacher/attendance"
            tone={toTake > 0 ? 'warning' : 'success'}
          />
          <StatTile
            icon={ClipboardList}
            label={t('teacher.homeworkOpen')}
            value={upcoming.length}
            href="/teacher/homework"
            tone="accent"
          />
          <StatTile
            icon={MessageSquare}
            label={t('teacher.unreadMessages')}
            value={unread.messages}
            href="/teacher/messages"
            tone="info"
          />
        </dl>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {off.includes('attendance') && off.includes('schedule') ? null : (
          <Panel
            title={t('teacher.todayTitle')}
            href="/teacher/attendance"
            linkLabel={t('seeAll')}
            className="lg:col-span-2"
          >
            <LessonsToday
              lessons={dayLessons.map((l) => ({ slot: l.slot, taken: l.taken }))}
              showRollCall={!off.includes('attendance')}
            />
          </Panel>
        )}

        {off.includes('homework') ? null : (
          <Panel
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

        {off.includes('announcements') ? null : (
          <Panel
            title={t('teacher.newsTitle')}
            href="/teacher/announcements"
            linkLabel={t('seeAll')}
            className="lg:col-span-3"
          >
            <AnnouncementsLatest
              items={announcements.ok ? announcements.data : []}
              base="/teacher/announcements"
              timeZone={tz}
            />
          </Panel>
        )}
      </div>
    </div>
  );
}
