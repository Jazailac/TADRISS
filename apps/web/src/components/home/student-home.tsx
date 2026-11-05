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
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { getDisabledModules } from '@/lib/modules';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { AnnouncementsLatest } from './announcements-latest';
import { bdi, Panel, StatTile } from './dash-parts';
import { LessonsToday } from './lessons-today';
import { DayCover } from './day-cover';
import { StudentWork, StudentMarks } from './student-briefing';

/** A student's home: today's timetable, work to do, how they are doing, and what is owed. */
export async function StudentHome() {
  const viewer = await getViewer();
  const tz = viewer?.profile.institution?.timezone ?? 'Africa/Casablanca';
  const userId = viewer?.session.userId ?? '';
  const today = todayIn(tz);
  const supabase = await getServerClient();
  const [t, app, w, locale, off, slots, homework, attendance, grades, invoices, announcements] =
    await Promise.all([
      getTranslations('dashboard'),
      getTranslations('app'),
      getTranslations('workspace'),
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
  const pending = (homework.ok ? homework.data : [])
    .filter((h) => homeworkBucket(h, today) !== 'done')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const todo = pending.slice(0, 4);
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
  const focus: { label: string; value: ReactNode; href?: string; progress?: number } =
    !off.includes('homework') && pending.length > 0
      ? { label: w('workFocus'), value: pending.length, href: '/student/homework' }
      : !off.includes('grades') && average !== null
        ? {
            label: w('gradeFocus'),
            value: `${num.format(average)}/20`,
            href: '/student/grades',
            progress: average / 20,
          }
        : { label: w('focus'), value: '–' };

  return (
    <div className="dashboard-page mx-auto grid w-full grid-cols-1 max-w-6xl gap-7">
      <DayCover
        title={app.rich('greeting', { name: viewer?.profile.firstName ?? '', n: bdi })}
        subtitle={t('student.subtitle')}
        date={today}
        focusLabel={focus.label}
        focusValue={focus.value}
        focusHint={w('studentHint')}
        focusHref={focus.href}
        progress={focus.progress}
      />

      <dl className="metric-strip dashboard-metrics dashboard-metrics-pairs grid grid-cols-2 lg:grid-cols-4">
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
            value={pending.length}
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
      <div className="day-layout">
        <div className="daybook-column">
          {off.includes('schedule') ? null : (
            <Panel
              kind="schedule"
              title={t('student.todayTitle')}
              href="/student/schedule"
              linkLabel={t('seeAll')}
            >
              <LessonsToday lessons={lessons.map((slot) => ({ slot }))} showTeacher />
            </Panel>
          )}
          {off.includes('announcements') ? null : (
            <Panel
              kind="news"
              title={t('student.newsTitle')}
              href="/student/announcements"
              linkLabel={t('seeAll')}
            >
              <AnnouncementsLatest
                items={announcements.ok ? announcements.data : []}
                base="/student/announcements"
                timeZone={tz}
              />
            </Panel>
          )}
        </div>
        <div className="daybook-column">
          {off.includes('homework') ? null : (
            <Panel
              kind="tasks"
              title={t('student.homeworkTitle')}
              href="/student/homework"
              linkLabel={t('seeAll')}
            >
              <StudentWork items={todo} today={today} href="/student/homework" />
            </Panel>
          )}
          {off.includes('grades') ? null : (
            <Panel
              kind="results"
              title={t('student.gradesTitle')}
              href="/student/grades"
              linkLabel={t('seeAll')}
            >
              <StudentMarks items={marks.slice(0, 4)} href="/student/grades" />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
