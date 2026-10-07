import { getHomework, getHomeworkProgress, listSubjects, todayIn } from '@tadriss/shared';
import { ArrowLeft, Check } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { subjectTone } from '../schedule/colors';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';
import { Meter } from '../ui/meter';
import { ArchiveHomeworkButton } from './archive-homework-button';
import { dueInfo } from './due';
import { EditHomeworkButton } from './homework-dialog';

/** One homework with its description and which students have finished it. */
export async function HomeworkDetailPage({ id }: { id: string }) {
  const viewer = await getViewer();
  const today = todayIn(viewer?.profile.institution?.timezone ?? 'Africa/Casablanca');
  const supabase = await getServerClient();
  const [t, f, hw, subjects] = await Promise.all([
    getTranslations('homework'),
    getFormatter(),
    getHomework(supabase, id),
    listSubjects(supabase, { includeArchived: true }),
  ]);
  if (!hw.ok) notFound();

  const h = hw.data;
  const mine = h.teacherId === viewer?.session.userId;
  const progress = mine ? await getHomeworkProgress(supabase, h.id, h.classId) : null;
  const due = dueInfo(t, f, h.dueDate, today);
  const done = progress?.ok ? progress.data.filter((s) => s.done).length : 0;
  const total = progress?.ok ? progress.data.length : 0;

  return (
    <div className="mx-auto grid max-w-4xl gap-7">
      <Link
        href="/teacher/homework"
        className="inline-flex w-fit items-center gap-2 text-sm text-text-muted hover:text-primary"
      >
        <ArrowLeft className="rtl-flip size-4" aria-hidden />
        {t('detail.back')}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cx(
                'rounded-lg border px-3 py-1 text-sm font-semibold',
                subjectTone[h.subjectColor],
              )}
            >
              <bdi>{h.subjectName}</bdi>
            </span>
            <Badge>{t('detail.class', { name: h.className })}</Badge>
            <Badge tone={due.tone}>{due.text}</Badge>
          </div>
          <h1 className="display mt-4 text-3xl md:text-4xl">
            <bdi>{h.title}</bdi>
          </h1>
        </div>
        {mine ? (
          <div className="flex flex-wrap items-center gap-2">
            {h.archived ? null : (
              <EditHomeworkButton homework={h} subjects={subjects.ok ? subjects.data : []} />
            )}
            <ArchiveHomeworkButton id={h.id} archived={h.archived} />
          </div>
        ) : null}
      </header>

      {h.archived ? (
        <p role="note" className="rounded-lg bg-warning-soft p-4 text-sm text-warning">
          {t('detail.archivedNotice')}
        </p>
      ) : null}

      <Card className="p-6">
        <p className="whitespace-pre-wrap leading-relaxed" dir="auto">
          {h.description ?? <span className="text-text-muted">{t('detail.noDescription')}</span>}
        </p>
      </Card>

      {progress ? (
        <Card className="overflow-hidden">
          <div className="border-b border-border p-5 sm:px-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">{t('progress.title')}</h2>
              <p className="font-mono text-sm tabular-nums text-text-muted">
                {t('progress.done', { done, total })}
              </p>
            </div>
            {total > 0 ? (
              <Meter
                value={done}
                max={total}
                tone="neutral"
                label={t('progress.title')}
                className="mt-3"
              />
            ) : null}
          </div>
          {!progress.ok ? (
            <p role="alert" className="p-6 text-sm text-danger">
              {t('error.body')}
            </p>
          ) : progress.data.length === 0 ? (
            <EmptyState title={t('empty.noClass.title')} description={t('empty.noClass.body')} />
          ) : (
            <ul aria-label={t('progress.list')} className="divide-y divide-border">
              {progress.data.map((s) => (
                <li key={s.studentId} className="flex items-center gap-4 px-5 py-3 sm:px-6">
                  <Avatar
                    first={s.firstName}
                    last={s.lastName}
                    seed={s.studentId}
                    className="size-9 text-xs"
                  />
                  <p className="min-w-0 flex-1 truncate font-medium">
                    <bdi>
                      {s.firstName} {s.lastName}
                    </bdi>
                  </p>
                  {s.done ? (
                    <Badge tone="success">
                      <Check className="size-3" aria-hidden />
                      {t('progress.finished')}
                    </Badge>
                  ) : (
                    <Badge>{t('progress.pending')}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}
