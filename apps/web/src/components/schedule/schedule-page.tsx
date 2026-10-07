import {
  currentSchoolYear,
  getClass,
  isSchoolYear,
  listClasses,
  listSlots,
  listSubjects,
  schoolYearOptions,
  weekdays,
} from '@tadriss/shared';
import { AlertCircle } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';
import { Select } from '../ui/field';
import { AddLessonButton } from './lesson-dialog';
import { SubjectsDialog } from './subjects-dialog';
import { WeekTimetable } from './week-timetable';

export type SchedulePageParams = { class?: string; year?: string };

export function ScheduleHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-xl text-text-muted">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function ScheduleError({
  title,
  body,
  retry,
  href,
}: {
  title: string;
  body: string;
  retry: string;
  href: string;
}) {
  return (
    <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
        <AlertCircle className="size-5" aria-hidden />
      </span>
      <h2 className="display text-2xl">{title}</h2>
      <p className="max-w-md text-sm text-text-muted">{body}</p>
      <ButtonLink href={href} variant="secondary" className="mt-2">
        {retry}
      </ButtonLink>
    </Card>
  );
}

/** Admin: pick a class, see and edit its week. */
export async function AdminSchedulePage({ params }: { params: SchedulePageParams }) {
  const year = isSchoolYear(params.year) ? params.year : currentSchoolYear();
  const years = [...new Set([...schoolYearOptions(), year])].sort();
  const supabase = await getServerClient();
  const [t, shell, errors, f, classes, subjects] = await Promise.all([
    getTranslations('schedule'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    listClasses(supabase, { schoolYear: year }),
    listSubjects(supabase, { includeArchived: true }),
  ]);

  const head = (actions?: ReactNode) => (
    <ScheduleHeader
      eyebrow={shell('school')}
      title={t('title')}
      subtitle={t('subtitle.admin')}
      actions={actions}
    />
  );
  const failed = (href: string) => (
    <div className="mx-auto grid max-w-6xl gap-7">
      {head()}
      <ScheduleError
        title={t('error.title')}
        body={t('error.body')}
        retry={errors('retry')}
        href={href}
      />
    </div>
  );

  if (!classes.ok || !subjects.ok) return failed('/dashboard/schedule');

  const selected = classes.data.find((c) => c.id === params.class) ?? classes.data[0];
  if (!selected) {
    return (
      <div className="mx-auto grid max-w-6xl gap-7">
        {head()}
        <Card>
          <EmptyState
            title={t('empty.noClasses.title')}
            description={t('empty.noClasses.body')}
            action={<ButtonLink href="/dashboard/classes">{t('empty.noClasses.cta')}</ButtonLink>}
          />
        </Card>
      </div>
    );
  }

  const [cls, slots] = await Promise.all([
    getClass(supabase, selected.id),
    listSlots(supabase, { classId: selected.id }),
  ]);
  if (!cls.ok || !slots.ok) return failed(`/dashboard/schedule?class=${selected.id}`);

  const teachers = cls.data.teachers.map((x) => ({
    id: x.id,
    name: `${x.firstName} ${x.lastName}`,
  }));
  // 2024-01-01 is a Monday: weekday d is the d-th day from it.
  const weekdayNames = weekdays.map((d) =>
    f.dateTime(new Date(Date.UTC(2024, 0, d)), { weekday: 'long', timeZone: 'UTC' }),
  );
  const common = { classId: selected.id, subjects: subjects.data, teachers, weekdayNames };

  return (
    <div className="mx-auto grid max-w-6xl gap-7">
      {head(
        <>
          <SubjectsDialog subjects={subjects.data} />
          <AddLessonButton {...common} />
        </>,
      )}

      <Card className="flex flex-wrap items-end gap-4 p-4 sm:p-5">
        <form method="get" className="flex items-end gap-2">
          <div className="grid gap-1.5">
            <label htmlFor="schedule-year" className="text-sm font-medium">
              {t('class.year')}
            </label>
            <Select id="schedule-year" name="year" defaultValue={year} className="h-10 w-36">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="submit"
            className="h-10 rounded-md bg-primary-soft px-4 text-sm font-medium text-primary hover:bg-primary-soft/70"
          >
            {t('class.apply')}
          </button>
        </form>
        <nav aria-label={t('class.nav')} className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
          {classes.data.map((c) => (
            <Link
              key={c.id}
              href={{ pathname: '/dashboard/schedule', query: { year, class: c.id } }}
              aria-current={c.id === selected.id ? 'page' : undefined}
              className={cx(
                'shrink-0 rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
                c.id === selected.id
                  ? 'bg-primary text-primary-foreground ring-primary'
                  : 'bg-surface text-text-muted ring-border-strong/70 hover:bg-surface-muted',
              )}
            >
              <bdi>{c.name}</bdi>
            </Link>
          ))}
        </nav>
      </Card>

      {slots.data.length === 0 ? (
        <Card>
          <EmptyState
            title={t('empty.noLessons.admin.title')}
            description={
              teachers.length === 0 ? t('lesson.noTeachers') : t('empty.noLessons.admin.body')
            }
          />
        </Card>
      ) : (
        <WeekTimetable slots={slots.data} detail="teacher" editable={common} />
      )}
    </div>
  );
}

/** Teacher or student: their own read-only week. */
export async function MySchedulePage({
  role,
  teacherId,
}: {
  role: 'teacher' | 'student';
  /** Teachers see only their own lessons (RLS also shows them co-teachers' lessons in shared classes). */
  teacherId?: string;
}) {
  const supabase = await getServerClient();
  const [t, shell, errors, slots, classes] = await Promise.all([
    getTranslations('schedule'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    listSlots(supabase, teacherId ? { teacherId } : {}),
    role === 'student'
      ? listClasses(supabase, { schoolYear: currentSchoolYear() })
      : Promise.resolve(null),
  ]);

  const head = (
    <ScheduleHeader eyebrow={shell('daily')} title={t('title')} subtitle={t(`subtitle.${role}`)} />
  );
  const home = role === 'teacher' ? '/teacher/schedule' : '/student/schedule';

  if (!slots.ok || (classes && !classes.ok)) {
    return (
      <div className="mx-auto grid max-w-6xl gap-7">
        {head}
        <ScheduleError
          title={t('error.title')}
          body={t('error.body')}
          retry={errors('retry')}
          href={home}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-7">
      {head}
      {slots.data.length === 0 ? (
        <Card>
          {classes?.ok && classes.data.length === 0 ? (
            <EmptyState
              title={t('empty.noClassStudent.title')}
              description={t('empty.noClassStudent.body')}
            />
          ) : (
            <EmptyState
              title={t(`empty.noLessons.${role}.title`)}
              description={t(`empty.noLessons.${role}.body`)}
            />
          )}
        </Card>
      ) : (
        <WeekTimetable slots={slots.data} detail={role === 'teacher' ? 'class' : 'both'} />
      )}
    </div>
  );
}
