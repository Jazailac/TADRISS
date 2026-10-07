import { getExam, getMarkSheet, listSubjects } from '@tadriss/shared';
import { ArrowLeft } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { subjectTone } from '../schedule/colors';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';
import { ArchiveExamButton, PublishButton } from './exam-actions';
import { EditExamButton } from './exam-dialog';
import { MarkSheet } from './mark-sheet';

/** One exam: its details and the mark sheet. Only the exam's own teacher can edit (RLS enforces it). */
export async function ExamDetailPage({ id, area }: { id: string; area: 'teacher' | 'admin' }) {
  const viewer = await getViewer();
  const supabase = await getServerClient();
  const [t, f, exam, subjects] = await Promise.all([
    getTranslations('grades'),
    getFormatter(),
    getExam(supabase, id),
    listSubjects(supabase, { includeArchived: true }),
  ]);
  if (!exam.ok) notFound();

  const x = exam.data;
  const mine = area === 'teacher' && x.teacherId === viewer?.session.userId;
  const sheet = await getMarkSheet(supabase, x.id, x.classId);
  const back = area === 'teacher' ? '/teacher/grades' : '/dashboard/grades';
  const missing = sheet.ok ? sheet.data.filter((r) => r.score === null && !r.absent).length : 0;

  return (
    <div className="mx-auto grid grid-cols-1 max-w-4xl gap-7">
      <Link
        href={back}
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
                subjectTone[x.subjectColor],
              )}
            >
              <bdi>{x.subjectName}</bdi>
            </span>
            <Badge>{t('detail.class', { name: x.className })}</Badge>
            <Badge>{t(`terms.${x.term === 2 ? '2' : '1'}`)}</Badge>
            <Badge>
              {t('row.coef', { value: x.coefficient })} {t('row.out', { max: x.maxScore })}
            </Badge>
            <Badge tone={x.published ? 'success' : 'neutral'} dot>
              {x.published ? t('status.published') : t('status.draft')}
            </Badge>
          </div>
          <h1 className="display mt-4 text-3xl md:text-4xl">
            <bdi>{x.title}</bdi>
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {f.dateTime(new Date(`${x.examDate}T12:00:00Z`), {
              dateStyle: 'full',
              timeZone: 'UTC',
            })}
            {area === 'admin' ? ` · ${t('row.teacher', { name: x.teacherName })}` : ''}
          </p>
        </div>
        {mine ? (
          <div className="flex flex-wrap items-center gap-2">
            {x.archived ? null : (
              <>
                <PublishButton id={x.id} published={x.published} missing={missing} />
                <EditExamButton exam={x} subjects={subjects.ok ? subjects.data : []} />
              </>
            )}
            <ArchiveExamButton id={x.id} archived={x.archived} />
          </div>
        ) : null}
      </header>

      {x.archived ? (
        <p role="note" className="rounded-lg bg-warning-soft p-4 text-sm text-warning">
          {t('detail.archivedNotice')}
        </p>
      ) : mine ? (
        <p
          role="note"
          className={cx(
            'rounded-lg p-4 text-sm',
            x.published ? 'bg-success-soft text-success' : 'bg-info-soft text-info',
          )}
        >
          {x.published ? t('detail.publishedNotice') : t('detail.draftNotice')}
        </p>
      ) : null}

      {!sheet.ok ? (
        <p role="alert" className="rounded-lg bg-danger-soft p-4 text-sm text-danger">
          {t('error.body')}
        </p>
      ) : sheet.data.length === 0 ? (
        <Card>
          <EmptyState
            title={t('sheet.noStudents.title')}
            description={t('sheet.noStudents.body')}
          />
        </Card>
      ) : (
        <MarkSheet
          examId={x.id}
          maxScore={x.maxScore}
          rows={sheet.data}
          canEdit={mine && !x.archived}
        />
      )}
    </div>
  );
}
