import {
  addDays,
  currentSchoolYear,
  listClasses,
  listExams,
  listSubjects,
  todayIn,
} from '@tadriss/shared';
import { AlertCircle } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';
import { NewExamButton } from './exam-dialog';
import { ExamRow } from './exam-row';

export type TeacherGradesParams = { term?: string; view?: string };

export async function TeacherGradesPage({ params }: { params: TeacherGradesParams }) {
  const viewer = await getViewer();
  const today = todayIn(viewer?.profile.institution?.timezone ?? 'Africa/Casablanca');
  const term = params.term === '1' ? 1 : params.term === '2' ? 2 : undefined;
  const deleted = params.view === 'deleted';
  const supabase = await getServerClient();

  const [t, shell, errors, f, exams, classes, subjects] = await Promise.all([
    getTranslations('grades'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    listExams(supabase, { teacherId: viewer?.session.userId, term, archived: deleted }),
    listClasses(supabase, { schoolYear: currentSchoolYear() }),
    listSubjects(supabase, { includeArchived: true }),
  ]);

  const head = (actions?: ReactNode) => (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow">{shell('daily')}</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
        <p className="mt-3 max-w-xl text-text-muted">{t('subtitle.teacher')}</p>
      </div>
      {actions}
    </header>
  );

  if (!exams.ok || !classes.ok || !subjects.ok) {
    return (
      <div className="mx-auto grid grid-cols-1 max-w-5xl gap-7">
        {head()}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href="/teacher/grades" variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const enrolled = new Map(classes.data.map((c) => [c.id, c.enrolled]));
  const link = (query: Record<string, string>) => ({ pathname: '/teacher/grades', query });
  const terms: { key: string; label: string; q: Record<string, string> }[] = [
    { key: 'all', label: t('filters.all'), q: {} },
    { key: '1', label: t('terms.1'), q: { term: '1' } },
    { key: '2', label: t('terms.2'), q: { term: '2' } },
  ];

  return (
    <div className="mx-auto grid grid-cols-1 max-w-5xl gap-7">
      {head(
        <NewExamButton
          classes={classes.data.map((c) => ({ id: c.id, name: c.name }))}
          subjects={subjects.data}
          defaultDate={addDays(today, 0)}
        />,
      )}

      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label={t('filters.view')} className="flex gap-1 rounded-lg bg-surface-muted p-1">
          {(['current', 'deleted'] as const).map((v) => (
            <Link
              key={v}
              href={link(v === 'deleted' ? { view: 'deleted' } : {})}
              aria-current={(v === 'deleted') === deleted ? 'page' : undefined}
              className={cx(
                'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                (v === 'deleted') === deleted
                  ? 'bg-surface text-text shadow-xs'
                  : 'text-text-muted hover:text-text',
              )}
            >
              {t(`filters.${v}`)}
            </Link>
          ))}
        </nav>
        {!deleted ? (
          <nav
            aria-label={t('filters.term')}
            className="flex gap-1 rounded-lg bg-surface-muted p-1"
          >
            {terms.map((x) => (
              <Link
                key={x.key}
                href={link(x.q)}
                aria-current={(term ? String(term) : 'all') === x.key ? 'page' : undefined}
                className={cx(
                  'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                  (term ? String(term) : 'all') === x.key
                    ? 'bg-surface text-text shadow-xs'
                    : 'text-text-muted hover:text-text',
                )}
              >
                {x.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>

      {exams.data.length === 0 ? (
        <Card>
          <EmptyState
            title={t(deleted ? 'empty.teacherDeleted.title' : 'empty.teacher.title')}
            description={t(deleted ? 'empty.teacherDeleted.body' : 'empty.teacher.body')}
          />
        </Card>
      ) : (
        <ul className="grid gap-3">
          {exams.data.map((x) => (
            <ExamRow
              key={x.id}
              exam={x}
              href={`/teacher/grades/${x.id}`}
              total={enrolled.get(x.classId)}
              t={t}
              f={f}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
