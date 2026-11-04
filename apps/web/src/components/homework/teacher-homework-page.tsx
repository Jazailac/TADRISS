import {
  addDays,
  currentSchoolYear,
  listClasses,
  listHomework,
  listSubjects,
  todayIn,
  utcDate,
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
import { Meter } from '../ui/meter';
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
    <header className="workspace-header flex flex-wrap items-end justify-between gap-5">
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
      <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-5xl gap-7">
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
    <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-5xl gap-7">
      {head(
        <NewHomeworkButton
          classes={classes.data.map((c) => ({ id: c.id, name: c.name }))}
          subjects={subjects.data}
          defaultDueDate={addDays(today, 1)}
        />,
      )}

      <nav
        aria-label={t('views.label')}
        className="workspace-tabs flex max-w-full w-fit flex-wrap gap-1 rounded-lg border border-border bg-surface-muted/60 p-1"
      >
        {tabs.map((v) => (
          <Link
            key={v}
            href={{ pathname: '/teacher/homework', query: v === 'upcoming' ? {} : { view: v } }}
            aria-current={view === v ? 'page' : undefined}
            className={cx(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
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
        <ul className="task-ledger workspace-list grid grid-cols-1 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
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
      <Link href={`/teacher/homework/${h.id}`} className="task-ledger-row workspace-row">
        <time className="task-ledger-date" dateTime={h.dueDate}>
          <span>{f.dateTime(utcDate(h.dueDate), { day: 'numeric', timeZone: 'UTC' })}</span>
          <span>{f.dateTime(utcDate(h.dueDate), { month: 'short', timeZone: 'UTC' })}</span>
        </time>
        <div className="task-ledger-body">
          <span
            className={cx(
              'inline-block max-w-full truncate rounded-md border px-2 py-0.5 text-xs font-semibold',
              subjectTone[h.subjectColor],
            )}
          >
            <bdi>{h.subjectName}</bdi>
          </span>
          <p className="mt-2 break-words font-medium">
            <bdi>{h.title}</bdi>
          </p>
          <p className="mt-1 text-xs text-text-muted">
            <bdi>{h.className}</bdi>
          </p>
        </div>
        <div className="task-ledger-state">
          <Badge tone={due.tone}>{due.text}</Badge>
          <p className="font-mono text-xs text-text-muted tabular-nums">
            {total !== undefined
              ? t('progress.done', { done: h.doneCount, total })
              : t('progress.doneOnly', { done: h.doneCount })}
          </p>
          {total !== undefined && total > 0 ? (
            <Meter value={h.doneCount} max={total} tone="neutral" label={t('progress.title')} />
          ) : null}
        </div>
      </Link>
    </li>
  );
}
