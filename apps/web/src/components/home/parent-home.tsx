import {
  attendanceRate,
  countStatuses,
  formatMoney,
  homeworkBucket,
  listAnnouncements,
  listHomework,
  listMyAttendance,
  listMyGrades,
  listMyInvoices,
  listSlots,
  todayIn,
  weekdayOf,
  weightedAverage20,
  type Child,
} from '@tadriss/shared';
import { BarChart3, CalendarCheck, ClipboardList, Wallet } from 'lucide-react';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { WithChild } from '../parent/with-child';
import { AnnouncementsLatest } from './announcements-latest';
import { bdi, EmptyLine, Panel, StatTile } from './dash-parts';
import { LessonsToday } from './lessons-today';

/** A parent's home: the selected child's day, work, results and balance, then the school's news. */
export function ParentHome({ childParam }: { childParam?: string }) {
  return (
    <WithChild path="/parent" childParam={childParam} render={(child) => <ChildHome child={child} />} />
  );
}

async function ChildHome({ child }: { child: Child }) {
  const viewer = await getViewer();
  const tz = viewer?.profile.institution?.timezone ?? 'Africa/Casablanca';
  const userId = viewer?.session.userId ?? '';
  const today = todayIn(tz);
  const supabase = await getServerClient();
  const [t, d, app, f, locale, slots, homework, attendance, grades, invoices, announcements] =
    await Promise.all([
      getTranslations('dashboard'),
      getTranslations('dashboard.parent'),
      getTranslations('app'),
      getFormatter(),
      getLocale(),
      child.classId ? listSlots(supabase, { classId: child.classId }) : Promise.resolve(null),
      child.classId
        ? listHomework(supabase, { studentId: child.id, classId: child.classId })
        : Promise.resolve(null),
      listMyAttendance(supabase, { studentId: child.id }),
      listMyGrades(supabase, { studentId: child.id }),
      listMyInvoices(supabase, { studentId: child.id }),
      listAnnouncements(supabase, userId, { limit: 4 }),
    ]);

  const weekday = weekdayOf(today);
  const lessons = (slots?.ok ? slots.data : []).filter((s) => s.weekday === weekday);
  const todo = (homework?.ok ? homework.data : []).filter(
    (h) => homeworkBucket(h, today) !== 'done',
  );
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
        <p className="mt-3 max-w-xl text-text-muted">
          {d.rich('subtitle', {
            name: `${child.firstName} ${child.lastName}`,
            cls: child.className ?? '',
            n: bdi,
          })}
        </p>
      </header>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={CalendarCheck}
          label={t('student.attendance')}
          value={rate === null ? '–' : `${num.format(rate)} %`}
          href={`/parent/attendance?child=${child.id}`}
          tone={rate !== null && rate < 85 ? 'warning' : 'success'}
        />
        <StatTile
          icon={BarChart3}
          label={t('student.average')}
          value={average === null ? '–' : `${num.format(average)}/20`}
          href={`/parent/grades?child=${child.id}`}
          tone="accent"
        />
        <StatTile
          icon={ClipboardList}
          label={t('student.homeworkTodo')}
          value={todo.length}
          href={`/parent/homework?child=${child.id}`}
          tone="info"
        />
        <StatTile
          icon={Wallet}
          label={t('student.owed')}
          value={formatMoney(owed, locale)}
          href={`/parent/payments?child=${child.id}`}
          tone={owed > 0 ? 'warning' : 'success'}
        />
      </dl>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          title={t('student.todayTitle')}
          href={`/parent/schedule?child=${child.id}`}
          linkLabel={t('seeAll')}
          className="lg:col-span-2"
        >
          {child.classId ? (
            <LessonsToday lessons={lessons.map((slot) => ({ slot }))} showTeacher />
          ) : (
            <EmptyLine>{d('noClass')}</EmptyLine>
          )}
        </Panel>
        <Panel title={t('student.newsTitle')} href="/parent/announcements" linkLabel={t('seeAll')}>
          <AnnouncementsLatest
            items={announcements.ok ? announcements.data : []}
            base="/parent/announcements"
            timeZone={tz}
          />
        </Panel>
      </div>
    </div>
  );
}
