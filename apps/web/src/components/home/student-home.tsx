import {
  attendanceRate,
  countStatuses,
  formatMoney,
  listAnnouncements,
  listHomework,
  listMyAttendance,
  listMyGrades,
  listMyInvoices,
  listSlots,
  todayIn,
  weekdayOf,
  weightedAverage20,
  homeworkBucket,
} from '@tadriss/shared';
import { BarChart3, CalendarCheck, ClipboardList, Wallet } from 'lucide-react';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { getDisabledModules } from '@/lib/modules';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { Badge } from '../ui/badge';
import { AnnouncementsLatest } from './announcements-latest';
import { bdi, EmptyLine, Panel, StatTile } from './dash-parts';
import { LessonsToday } from './lessons-today';

/** A student's home: today's timetable, work to do, how they are doing, and what is owed. */
export async function StudentHome() {
  const viewer = await getViewer();
  const tz = viewer?.profile.institution?.timezone ?? 'Africa/Casablanca';
  const userId = viewer?.session.userId ?? '';
  const today = todayIn(tz);
  const supabase = await getServerClient();
  const [t, app, f, locale, off, slots, homework, attendance, grades, invoices, announcements] =
    await Promise.all([
      getTranslations('dashboard'),
      getTranslations('app'),
      getFormatter(),
      getLocale(),
      getDisabledModules(),
      listSlots(supabase),
      listHomework(supabase),
      listMyAttendance(supabase),
      listMyGrades(supabase),
      listMyInvoices(supabase),
      listAnnouncements(supabase, userId, { limit: 4 }),
    ]);

  const weekday = weekdayOf(today);
  const lessons = (slots.ok ? slots.data : []).filter((s) => s.weekday === weekday);
  const todo = (homework.ok ? homework.data : [])
    .filter((h) => homeworkBucket(h, today) !== 'done')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);
  const rate = attendance.ok ? attendanceRate(countStatuses(attendance.data)) : null;
  const marks = grades.ok ? grades.data : [];
  const average = weightedAverage20(
    marks.map((m) => ({
      score: m.score,
      absent: m.absent,
      maxScore: m.maxScore,
      coefficient: m.coefficient,
      subjectId: m.subjectId,
    })),
  );
  const owed = (invoices.ok ? invoices.data : [])
    .filter((i) => !i.voided)
    .reduce((n, i) => n + i.balanceCentimes, 0);
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  return (
    <div className="mx-auto grid grid-cols-1 max-w-6xl gap-7">
      <header>
        <p className="eyebrow">
          {f.dateTime(new Date(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz })}
        </p>
        <h1 className="display mt-4 text-4xl md:text-5xl">
          {app.rich('greeting', { name: viewer?.profile.firstName ?? '', n: bdi })}
        </h1>
        <p className="mt-3 max-w-xl text-text-muted">{t('student.subtitle')}</p>
      </header>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {off.includes('attendance') ? null : (
          <StatTile
            icon={CalendarCheck}
            label={t('student.attendance')}
            value={rate === null ? '–' : `${num.format(rate)} %`}
            href="/student/attendance"
            tone={rate !== null && rate < 85 ? 'warning' : 'success'}
          />
        )}
        {off.includes('grades') ? null : (
          <StatTile
            icon={BarChart3}
            label={t('student.average')}
            value={average === null ? '–' : `${num.format(average)}/20`}
            href="/student/grades"
            tone="accent"
          />
        )}
        {off.includes('homework') ? null : (
          <StatTile
            icon={ClipboardList}
            label={t('student.homeworkTodo')}
            value={todo.length}
            href="/student/homework"
            tone="info"
          />
        )}
        {off.includes('payments') ? null : (
          <StatTile
            icon={Wallet}
            label={t('student.owed')}
            value={formatMoney(owed, locale)}
            href="/student/payments"
            tone={owed > 0 ? 'warning' : 'success'}
          />
        )}
      </dl>

      <div className="grid gap-5 lg:grid-cols-3">
        {off.includes('schedule') ? null : (
          <Panel
            title={t('student.todayTitle')}
            href="/student/schedule"
            linkLabel={t('seeAll')}
            className="lg:col-span-2"
          >
            <LessonsToday lessons={lessons.map((slot) => ({ slot }))} showTeacher />
          </Panel>
        )}

        {off.includes('homework') ? null : (
          <Panel
            title={t('student.homeworkTitle')}
            href="/student/homework"
            linkLabel={t('seeAll')}
          >
            {todo.length === 0 ? (
              <EmptyLine>{t('student.noHomework')}</EmptyLine>
            ) : (
              <ul className="grid grid-cols-1 divide-y divide-border">
                {todo.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium" dir="auto">
                        <bdi>{h.title}</bdi>
                      </span>
                      <span className="block truncate text-xs text-text-muted">
                        <bdi>{h.subjectName}</bdi>
                      </span>
                    </span>
                    <Badge tone={h.dueDate < today ? 'danger' : 'neutral'}>
                      {f.dateTime(new Date(`${h.dueDate}T00:00:00Z`), {
                        day: 'numeric',
                        month: 'short',
                        timeZone: 'UTC',
                      })}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {off.includes('grades') ? null : (
          <Panel title={t('student.gradesTitle')} href="/student/grades" linkLabel={t('seeAll')}>
            {marks.length === 0 ? (
              <EmptyLine>{t('student.noGrades')}</EmptyLine>
            ) : (
              <ul className="grid grid-cols-1 divide-y divide-border">
                {marks.slice(0, 4).map((m) => (
                  <li key={m.examId} className="flex items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium" dir="auto">
                        <bdi>{m.title}</bdi>
                      </span>
                      <span className="block truncate text-xs text-text-muted">
                        <bdi>{m.subjectName}</bdi>
                      </span>
                    </span>
                    <span className="font-mono tabular-nums">
                      {m.absent || m.score === null
                        ? t('student.absent')
                        : `${num.format(m.score)}/${num.format(m.maxScore)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {off.includes('announcements') ? null : (
          <Panel
            title={t('student.newsTitle')}
            href="/student/announcements"
            linkLabel={t('seeAll')}
            className="lg:col-span-2"
          >
            <AnnouncementsLatest
              items={announcements.ok ? announcements.data : []}
              base="/student/announcements"
              timeZone={tz}
            />
          </Panel>
        )}
      </div>
    </div>
  );
}
