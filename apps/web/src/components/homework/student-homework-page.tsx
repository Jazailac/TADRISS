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
export async function StudentHomeworkPage() {
  const viewer = await getViewer();
  const today = todayIn(viewer?.profile.institution?.timezone ?? 'Africa/Casablanca');
  const supabase = await getServerClient();
  const [t, shell, errors, f, homework, classes] = await Promise.all([
    getTranslations('homework'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    listHomework(supabase),
    listClasses(supabase, { schoolYear: currentSchoolYear() }),
  ]);

  const head = (
    <header>
      <p className="eyebrow">{shell('daily')}</p>
      <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
      <p className="mt-3 max-w-xl text-text-muted">{t('subtitle.student')}</p>
    </header>
  );

  if (!homework.ok) {
    return (
      <div className="mx-auto grid max-w-3xl gap-7">
        {head}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href="/student/homework" variant="secondary" className="mt-2">
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

  const noClass = classes.ok && classes.data.length === 0;
  const sections: HomeworkBucket[] = ['overdue', 'upcoming', 'done'];

  return (
    <div className="mx-auto grid max-w-3xl gap-8">
      {head}
      {homework.data.length === 0 ? (
        <Card>
          <EmptyState
            title={noClass ? t('empty.noClass.title') : t('empty.student.title')}
            description={noClass ? t('empty.noClass.body') : t('empty.student.body')}
          />
        </Card>
      ) : (
        sections.map((bucket) => {
          const items = buckets[bucket];
          if (items.length === 0) {
            return bucket === 'upcoming' ? (
              <p key={bucket} className="rounded-lg bg-success-soft p-4 text-sm text-success">
                {t('student.allClear')}
              </p>
            ) : null;
          }
          return (
            <section key={bucket} aria-labelledby={`hw-${bucket}`}>
              <h2 id={`hw-${bucket}`} className="mb-3 flex items-center gap-2 font-semibold">
                {t(`student.${bucket}`)}
                <Badge
                  tone={bucket === 'overdue' ? 'danger' : bucket === 'done' ? 'success' : 'primary'}
                >
                  {f.number(items.length)}
                </Badge>
              </h2>
              <ul aria-label={t('student.list')} className="grid gap-3">
                {items.map((h) => {
                  const due = dueInfo(t, f, h.dueDate, today, bucket === 'done');
                  return (
                    <li key={h.id}>
                      <Card
                        className={cx('flex gap-4 p-4 sm:p-5', bucket === 'done' && 'opacity-75')}
                      >
                        <DoneToggle id={h.id} title={h.title} done={bucket === 'done'} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cx(
                                'rounded-md border px-2 py-0.5 text-xs font-semibold',
                                subjectTone[h.subjectColor],
                              )}
                            >
                              <bdi>{h.subjectName}</bdi>
                            </span>
                            <Badge tone={due.tone}>{due.text}</Badge>
                          </div>
                          <p
                            className={cx('mt-2 font-medium', bucket === 'done' && 'line-through')}
                          >
                            <bdi>{h.title}</bdi>
                          </p>
                          {h.description ? (
                            <p
                              className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-muted"
                              dir="auto"
                            >
                              {h.description}
                            </p>
                          ) : null}
                          <p className="mt-2 text-xs text-text-muted">
                            {t('student.teacher', { name: h.teacherName })}
                          </p>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
