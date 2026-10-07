import {
  addDays,
  ATTENDANCE_EDIT_WINDOW_DAYS,
  getClassSummary,
  getDayLessons,
  isIsoDate,
  timeRange,
  todayIn,
  utcDate,
  type DayLesson,
} from '@tadriss/shared';
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getViewer } from '@/lib/viewer';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';
import { Input } from '../ui/field';
import { Meter } from '../ui/meter';
import { subjectTone } from '../schedule/colors';
import { statusMeta } from './status';

export type AttendanceDayParams = { date?: string };
export type AttendanceArea = 'admin' | 'teacher';

const basePath = (area: AttendanceArea) =>
  area === 'admin' ? '/dashboard/attendance' : '/teacher/attendance';

/** Teacher: today's lessons to roll-call. Admin: every lesson of the day plus class attendance rates. */
export async function AttendanceDayPage({
  area,
  params,
}: {
  area: AttendanceArea;
  params: AttendanceDayParams;
}) {
  const viewer = await getViewer();
  const tz = viewer?.profile.institution?.timezone ?? 'Africa/Casablanca';
  const today = todayIn(tz);
  const date = isIsoDate(params.date) ? params.date : today;
  const base = basePath(area);

  const [t, shell, errors, f, lessons, summary] = await Promise.all([
    getTranslations('attendance'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    (async () => {
      const { getServerClient } = await import('@/lib/supabase/server');
      return getDayLessons(await getServerClient(), {
        date,
        teacherId: area === 'teacher' ? viewer?.session.userId : undefined,
      });
    })(),
    (async () => {
      if (area !== 'admin') return null;
      const { getServerClient } = await import('@/lib/supabase/server');
      return getClassSummary(await getServerClient(), addDays(date, -29), date);
    })(),
  ]);

  const dateLabel = f.dateTime(utcDate(date), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const header = (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow">{shell('daily')}</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
        <p className="mt-3 max-w-xl text-text-muted">{t(`subtitle.${area}`)}</p>
      </div>
    </header>
  );

  if (!lessons.ok || (summary && !summary.ok)) {
    return (
      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-7">
        {header}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink
            href={{ pathname: base, query: { date } }}
            variant="secondary"
            className="mt-2"
          >
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const future = date > today;
  const tooOld = area === 'teacher' && date < addDays(today, -ATTENDANCE_EDIT_WINDOW_DAYS);

  return (
    <div className="mx-auto grid grid-cols-1 max-w-6xl gap-7">
      {header}

      <Card className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <div className="flex items-center gap-1">
          <Link
            href={{ pathname: base, query: { date: addDays(date, -1) } }}
            aria-label={t('date.previous')}
            className="grid size-10 place-items-center rounded-lg text-text-muted hover:bg-surface-muted"
          >
            <ChevronLeft className="rtl-flip size-4" aria-hidden />
          </Link>
          <Link
            href={{ pathname: base, query: { date: addDays(date, 1) } }}
            aria-label={t('date.next')}
            className="grid size-10 place-items-center rounded-lg text-text-muted hover:bg-surface-muted"
          >
            <ChevronRight className="rtl-flip size-4" aria-hidden />
          </Link>
        </div>
        <p className="flex min-w-0 flex-1 basis-48 items-center gap-2 font-semibold">
          <CalendarDays className="size-4 shrink-0 text-text-muted" aria-hidden />
          <span className="truncate capitalize">{dateLabel}</span>
        </p>
        <form method="get" className="flex items-center gap-2">
          <label htmlFor="att-date" className="sr-only">
            {t('date.label')}
          </label>
          <Input id="att-date" name="date" type="date" defaultValue={date} className="h-10 w-44" />
          <button
            type="submit"
            className="h-10 rounded-md bg-primary-soft px-4 text-sm font-medium text-primary hover:bg-primary-soft/70"
          >
            {t('date.go')}
          </button>
        </form>
        {date !== today ? (
          <Link
            href={{ pathname: base, query: {} }}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('date.today')}
          </Link>
        ) : null}
      </Card>

      {lessons.data.length === 0 ? (
        <Card>
          <EmptyState
            title={t('lessons.empty.title')}
            description={
              new Date(`${date}T12:00:00Z`).getUTCDay() === 0
                ? t('date.sunday')
                : area === 'admin'
                  ? t('lessons.empty.bodyAdmin')
                  : t('lessons.empty.bodyTeacher')
            }
          />
        </Card>
      ) : (
        <ul aria-label={t('lessons.list')} className="grid gap-3">
          {lessons.data.map((l) => (
            <LessonRow
              key={l.slot.id}
              lesson={l}
              href={`${base}/${l.slot.id}?date=${date}`}
              area={area}
              state={future ? 'upcoming' : l.taken ? 'done' : 'todo'}
              canEdit={!future && !tooOld}
              t={t}
            />
          ))}
        </ul>
      )}

      {area === 'admin' && summary?.ok ? (
        <Card className="overflow-hidden">
          <div className="border-b border-border p-5 sm:px-6">
            <h2 className="font-semibold">{t('summary.title')}</h2>
            <p className="mt-1 text-sm text-text-muted">
              {t('summary.subtitle', {
                date: f.dateTime(utcDate(date), { dateStyle: 'medium', timeZone: 'UTC' }),
              })}
            </p>
          </div>
          {summary.data.length === 0 ? (
            <p className="p-6 text-sm text-text-muted">{t('summary.empty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {summary.data.map((c) => (
                <li
                  key={c.classId}
                  className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5 sm:px-6"
                >
                  <p className="min-w-0 flex-1 basis-32 truncate font-medium">
                    <bdi>{c.className}</bdi>
                  </p>
                  <div className="flex w-56 items-center gap-3">
                    {c.rate !== null ? (
                      <Meter
                        value={c.rate}
                        max={100}
                        tone="neutral"
                        label={t('summary.rateLabel')}
                      />
                    ) : null}
                    <span className="w-12 shrink-0 text-end font-mono text-sm tabular-nums">
                      {c.rate === null ? '—' : f.number(c.rate / 100, { style: 'percent' })}
                    </span>
                  </div>
                  <p className="w-44 font-mono text-xs text-text-muted tabular-nums">
                    {t('summary.absences')} {f.number(c.counts.absent)} · {t('summary.lates')}{' '}
                    {f.number(c.counts.late)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-border p-4 text-xs text-text-muted sm:px-6">
            {t('summary.help')}
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function LessonRow({
  lesson,
  href,
  area,
  state,
  canEdit,
  t,
}: {
  lesson: DayLesson;
  href: string;
  area: AttendanceArea;
  state: 'upcoming' | 'done' | 'todo';
  canEdit: boolean;
  t: Awaited<ReturnType<typeof getTranslations<'attendance'>>>;
}) {
  const { slot, counts } = lesson;
  return (
    <li>
      <Card className="flex flex-wrap items-center gap-x-5 gap-y-3 p-4 sm:px-5">
        <p className="w-28 shrink-0 font-mono text-sm tabular-nums text-text-muted">
          {timeRange(slot)}
        </p>
        <div
          className={cx(
            'min-w-0 flex-1 basis-48 rounded-lg border px-3 py-2',
            subjectTone[slot.subjectColor],
          )}
        >
          <p className="truncate text-sm font-semibold">
            <bdi>{slot.subjectName}</bdi> · <bdi>{slot.className}</bdi>
          </p>
          {area === 'admin' ? (
            <p className="truncate text-xs opacity-90">
              {t('lessons.teacher', { name: slot.teacherName })}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {state === 'done' ? (
            <>
              <Badge tone="success" dot>
                {t('lessons.done')}
              </Badge>
              {(['present', 'late', 'absent', 'excused'] as const).map((s) =>
                counts[s] > 0 ? (
                  <Badge key={s} tone={statusMeta[s].tone}>
                    <span className="font-mono tabular-nums">{counts[s]}</span> {t(`status.${s}`)}
                  </Badge>
                ) : null,
              )}
            </>
          ) : (
            <Badge tone={state === 'todo' ? 'warning' : 'neutral'} dot>
              {state === 'todo' ? t('lessons.todo') : t('lessons.upcoming')}
            </Badge>
          )}
        </div>
        {state !== 'upcoming' ? (
          <ButtonLink href={href} variant={state === 'todo' ? 'primary' : 'secondary'} size="sm">
            {state === 'todo' ? t('lessons.take') : canEdit ? t('lessons.edit') : t('lessons.view')}
          </ButtonLink>
        ) : null}
      </Card>
    </li>
  );
}
