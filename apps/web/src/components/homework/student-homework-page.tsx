import {
  homeworkBucket,
  listClasses,
  listHomework,
  currentSchoolYear,
  todayIn,
  type HomeworkBucket,
  type HomeworkView,
} from '@tadriss/shared';
import { AlertCircle } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { subjectTone } from '../schedule/colors';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';
import { dueInfo } from './due';
import { DoneToggle } from './done-toggle';

/** The student's homework in three buckets: overdue, to do, done. */
export async function StudentHomeworkPage({
  studentId,
  classId,
  hasClass,
  base = '/student',
}: {
  /** A parent looks at one child's class: ticks are then read-only. */
  studentId?: string;
  classId?: string | null;
  hasClass?: boolean;
  base?: string;
} = {}) {
  const readOnly = studentId !== undefined;
  const viewer = await getViewer();
  const today = todayIn(viewer?.profile.institution?.timezone ?? 'Africa/Casablanca');
  const supabase = await getServerClient();
  const [t, shell, errors, f, homework, classes] = await Promise.all([
    getTranslations('homework'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    classId === null
      ? Promise.resolve({ ok: true as const, data: [] })
      : listHomework(supabase, { studentId, classId: classId ?? undefined }),
    listClasses(supabase, { schoolYear: currentSchoolYear() }),
  ]);

  const head = (
    <header className="workspace-header">
      <p className="eyebrow">{shell('daily')}</p>
      <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
      <p className="mt-3 max-w-xl text-text-muted">
        {readOnly ? t('subtitle.parent') : t('subtitle.student')}
      </p>
    </header>
  );

  if (!homework.ok) {
    return (
      <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-3xl gap-7">
        {head}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink
            href={readOnly ? `${base}/homework?child=${studentId}` : `${base}/homework`}
            variant="secondary"
            className="mt-2"
          >
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const buckets: Record<HomeworkBucket, HomeworkView[]> = { overdue: [], upcoming: [], done: [] };
  for (const h of homework.data) buckets[homeworkBucket(h, today)].push(h);
  buckets.overdue.sort((a, b) => b.dueDate.localeCompare(a.dueDate)); // most recently missed first
  buckets.done.sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  const noClass = hasClass === undefined ? classes.ok && classes.data.length === 0 : !hasClass;
  const sections: HomeworkBucket[] = ['overdue', 'upcoming', 'done'];
  buckets.upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="workspace-page homework-page w-full mx-auto grid grid-cols-1 max-w-3xl gap-8">
      {head}
      {homework.data.length === 0 ? (
        <Card>
          <EmptyState
            title={noClass ? t('empty.noClass.title') : t('empty.student.title')}
            description={noClass ? t('empty.noClass.body') : t('empty.student.body')}
          />
        </Card>
      ) : (
        <>
          <nav className="homework-status-nav" aria-label={t('progress.title')}>
            {sections.map((bucket) => {
              const count = buckets[bucket].length;
              const label = (
                <>
                  <span>{t(`student.${bucket}`)}</span>
                  <span className="homework-status-count">{f.number(count)}</span>
                </>
              );
              return count > 0 ? (
                <a key={bucket} href={`#hw-${bucket}`} data-bucket={bucket}>
                  {label}
                </a>
              ) : (
                <span key={bucket} className="homework-status-empty" data-bucket={bucket}>
                  {label}
                </span>
              );
            })}
          </nav>
          <div className="homework-checklist">
            {sections.map((bucket) => {
              const items = buckets[bucket];
              if (items.length === 0) {
                return bucket === 'upcoming' && buckets.overdue.length === 0 ? (
                  <p key={bucket} className="rounded-lg bg-success-soft p-4 text-sm text-success">
                    {t('student.allClear')}
                  </p>
                ) : null;
              }
              return (
                <section key={bucket} aria-labelledby={`hw-${bucket}`} data-bucket={bucket}>
                  <h2
                    id={`hw-${bucket}`}
                    className="task-section-heading mb-4 flex items-center gap-3 text-sm font-semibold"
                    tabIndex={-1}
                  >
                    {t(`student.${bucket}`)}
                    <Badge
                      tone={
                        bucket === 'overdue' ? 'danger' : bucket === 'done' ? 'success' : 'primary'
                      }
                    >
                      {f.number(items.length)}
                    </Badge>
                  </h2>
                  <ul
                    aria-label={t('student.list')}
                    className="workspace-list grid grid-cols-1 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface"
                  >
                    {items.map((h) => {
                      const due = dueInfo(t, f, h.dueDate, today, bucket === 'done');
                      const dueDate = t('due.on', {
                        date: f.dateTime(new Date(`${h.dueDate}T12:00:00Z`), {
                          dateStyle: 'medium',
                          timeZone: 'UTC',
                        }),
                      });
                      return (
                        <li key={h.id}>
                          <div className="workspace-row homework-task-row flex gap-4">
                            {!readOnly ? (
                              <DoneToggle id={h.id} title={h.title} done={bucket === 'done'} />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <div className="homework-task-heading">
                                <span
                                  className={cx(
                                    'homework-task-subject rounded-md border px-2 py-0.5 text-xs font-semibold',
                                    subjectTone[h.subjectColor],
                                  )}
                                >
                                  <bdi>{h.subjectName}</bdi>
                                </span>
                                {bucket !== 'done' && due.text !== dueDate ? (
                                  <Badge tone={due.tone}>{due.text}</Badge>
                                ) : null}
                              </div>
                              <p className="homework-task-title">
                                <bdi>{h.title}</bdi>
                              </p>
                              <div className="homework-task-meta">
                                <time dateTime={h.dueDate}>{dueDate}</time>
                                <span>
                                  <bdi>{t('student.teacher', { name: h.teacherName })}</bdi>
                                </span>
                              </div>
                              {h.description ? (
                                <p
                                  className="homework-task-description whitespace-pre-wrap"
                                  dir="auto"
                                >
                                  {h.description}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
