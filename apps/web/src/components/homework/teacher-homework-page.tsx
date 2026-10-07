import {
  addDays,
  currentSchoolYear,
  listClasses,
  listHomework,
  listSubjects,
  todayIn,
  type HomeworkView,
} from '@tadriss/shared';
import { AlertCircle } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { subjectTone } from '../schedule/colors';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';
import { dueInfo } from './due';
import { NewHomeworkButton } from './homework-dialog';

export type TeacherHomeworkParams = { view?: string };
type View = 'upcoming' | 'past' | 'deleted';
const parseView = (v?: string): View => (v === 'past' || v === 'deleted' ? v : 'upcoming');

export async function TeacherHomeworkPage({ params }: { params: TeacherHomeworkParams }) {
  const viewer = await getViewer();
  const today = todayIn(viewer?.profile.institution?.timezone ?? 'Africa/Casablanca');
  const view = parseView(params.view);
  const supabase = await getServerClient();

  const [t, shell, errors, f, homework, classes, subjects] = await Promise.all([
    getTranslations('homework'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    listHomework(supabase, { teacherId: viewer?.session.userId, archived: view === 'deleted' }),
    listClasses(supabase, { schoolYear: currentSchoolYear() }),
    listSubjects(supabase, { includeArchived: true }),
  ]);

  const enrolled = new Map(classes.ok ? classes.data.map((c) => [c.id, c.enrolled]) : []);
  const head = (actions?: React.ReactNode) => (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow">{shell('daily')}</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
        <p className="mt-3 max-w-xl text-text-muted">{t('subtitle.teacher')}</p>
      </div>
      {actions}
    </header>
  );

  if (!homework.ok || !classes.ok || !subjects.ok) {
    return (
      <div className="mx-auto grid max-w-5xl gap-7">
        {head()}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href="/teacher/homework" variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const shown =
    view === 'deleted'
      ? homework.data
      : homework.data.filter((h) => (view === 'upcoming' ? h.dueDate >= today : h.dueDate < today));
  if (view === 'past') shown.reverse(); // most recent deadline first

  const tabs: View[] = ['upcoming', 'past', 'deleted'];
  const emptyKey =
    view === 'upcoming' ? 'teacher' : view === 'past' ? 'teacherPast' : 'teacherDeleted';

  return (
    <div className="mx-auto grid max-w-5xl gap-7">
      {head(
        <NewHomeworkButton
          classes={classes.data.map((c) => ({ id: c.id, name: c.name }))}
          subjects={subjects.data}
          defaultDueDate={addDays(today, 1)}
        />,
      )}

      <nav
        aria-label={t('views.label')}
        className="flex w-fit gap-1 rounded-lg bg-surface-muted p-1"
      >
        {tabs.map((v) => (
          <Link
            key={v}
            href={{ pathname: '/teacher/homework', query: v === 'upcoming' ? {} : { view: v } }}
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

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            title={t(`empty.${emptyKey}.title`)}
            description={t(`empty.${emptyKey}.body`)}
          />
        </Card>
      ) : (
        <ul className="grid gap-3">
          {shown.map((h) => (
            <HomeworkRow
              key={h.id}
              h={h}
              total={enrolled.get(h.classId)}
              today={today}
              t={t}
              f={f}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function HomeworkRow({
  h,
  total,
  today,
  t,
  f,
}: {
  h: HomeworkView;
  total: number | undefined;
  today: string;
  t: Awaited<ReturnType<typeof getTranslations<'homework'>>>;
  f: Awaited<ReturnType<typeof getFormatter>>;
}) {
  const due = dueInfo(t, f, h.dueDate, today);
  return (
    <li>
      <Link
        href={`/teacher/homework/${h.id}`}
        className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm transition-[box-shadow,border-color] hover:border-border-strong hover:shadow-md sm:px-5"
      >
        <span
          className={cx(
            'w-36 shrink-0 truncate rounded-lg border px-3 py-1.5 text-sm font-semibold',
            subjectTone[h.subjectColor],
          )}
        >
          <bdi>{h.subjectName}</bdi>
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <p className="truncate font-medium">
            <bdi>{h.title}</bdi>
          </p>
          <p className="truncate text-sm text-text-muted">
            <bdi>{h.className}</bdi>
          </p>
        </div>
        <Badge tone={due.tone}>{due.text}</Badge>
        <span className="font-mono text-xs text-text-muted tabular-nums">
          {total !== undefined
            ? t('progress.done', { done: h.doneCount, total })
            : t('progress.doneOnly', { done: h.doneCount })}
        </span>
      </Link>
    </li>
  );
}
