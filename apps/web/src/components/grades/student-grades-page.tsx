import {
  listClasses,
  listMyGrades,
  currentSchoolYear,
  mention,
  overallAverage,
  subjectAverages,
  weightedAverage20,
  type MarkForAverage,
  type MyGrade,
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

export type StudentGradesParams = { term?: string };

const forAverage = (g: MyGrade): MarkForAverage => ({
  subjectId: g.subjectId,
  score: g.score,
  absent: g.absent,
  maxScore: g.maxScore,
  coefficient: g.coefficient,
});

/** A student's published marks: the general average, then each subject with its exams. */
export async function StudentGradesPage({
  params,
  studentId,
  base = '/student',
  query = {},
  hasClass,
}: {
  params: StudentGradesParams;
  studentId?: string;
  base?: string;
  /** Extra query parameters kept on the term tabs (e.g. which child). */
  query?: Record<string, string>;
  hasClass?: boolean;
}) {
  const term = params.term === '1' ? 1 : params.term === '2' ? 2 : undefined;
  const supabase = await getServerClient();
  const viewer = await getViewer();
  const reportFor = studentId ?? viewer?.session.userId;
  const [t, tr, shell, errors, f, grades, classes] = await Promise.all([
    getTranslations('grades'),
    getTranslations('report'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    listMyGrades(supabase, { studentId }),
    listClasses(supabase, { schoolYear: currentSchoolYear() }),
  ]);

  const head = (
    <header>
      <p className="eyebrow">{shell('daily')}</p>
      <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
      <p className="mt-3 max-w-xl text-text-muted">{t('subtitle.student')}</p>
    </header>
  );

  if (!grades.ok) {
    return (
      <div className="mx-auto grid grid-cols-1 max-w-4xl gap-7">
        {head}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href={`${base}/grades`} variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const shown = term ? grades.data.filter((g) => g.term === term) : grades.data;
  const marks = shown.map(forAverage);
  const overall = overallAverage(marks);
  const perSubject = subjectAverages(marks);
  const subjects = [...new Map(shown.map((g) => [g.subjectId, g])).values()].sort((a, b) =>
    a.subjectName.localeCompare(b.subjectName),
  );
  const noClass = hasClass === undefined ? classes.ok && classes.data.length === 0 : !hasClass;
  const num = (n: number) => f.number(n, { maximumFractionDigits: 2 });
  const tabs = [
    { key: 'all', label: t('filters.all'), q: { ...query } },
    { key: '1', label: t('terms.1'), q: { ...query, term: '1' } },
    { key: '2', label: t('terms.2'), q: { ...query, term: '2' } },
  ];

  return (
    <div className="mx-auto grid grid-cols-1 max-w-4xl gap-7">
      {head}

      {grades.data.length === 0 ? (
        <Card>
          <EmptyState
            title={noClass ? t('empty.noClass.title') : t('empty.student.title')}
            description={noClass ? t('empty.noClass.body') : t('empty.student.body')}
          />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav
              aria-label={t('student.termLabel')}
              className="flex w-fit gap-1 rounded-lg bg-surface-muted p-1"
            >
              {tabs.map((x) => (
                <Link
                  key={x.key}
                  href={{ pathname: `${base}/grades`, query: x.q }}
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
            {reportFor ? (
              <ButtonLink
                variant="secondary"
                href={{
                  pathname: `/report/${reportFor}`,
                  query: term ? { term: String(term) } : {},
                }}
              >
                {tr('print')}
              </ButtonLink>
            ) : null}
          </div>

          <Card className="flex flex-wrap items-center gap-x-8 gap-y-3 p-6">
            <div>
              <p className="text-sm text-text-muted">{t('student.overall')}</p>
              <p className="mt-1 font-mono text-5xl font-medium tabular-nums">
                {overall === null ? t('student.noScore') : num(overall)}
                <span className="ms-2 text-lg text-text-muted">{t('row.out', { max: 20 })}</span>
              </p>
            </div>
            {overall !== null ? (
              <Badge tone={overall >= 10 ? 'success' : 'warning'} dot>
                {t(`student.mention.${mention(overall)}`)}
              </Badge>
            ) : null}
            <p className="ms-auto max-w-xs text-xs text-text-muted">{t('student.help')}</p>
          </Card>

          <section aria-label={t('student.bySubject')} className="grid gap-4">
            {subjects.map((s) => {
              const avg = perSubject.get(s.subjectId);
              const list = shown.filter((g) => g.subjectId === s.subjectId);
              return (
                <Card key={s.subjectId} className="overflow-hidden">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border p-4 sm:px-5">
                    <span
                      className={cx(
                        'rounded-lg border px-3 py-1 text-sm font-semibold',
                        subjectTone[s.subjectColor],
                      )}
                    >
                      <bdi>{s.subjectName}</bdi>
                    </span>
                    <p className="text-sm text-text-muted">
                      {t('student.subject', { subject: s.subjectName })}
                    </p>
                    <div className="ms-auto flex w-48 items-center gap-3">
                      {avg !== undefined ? (
                        <>
                          <Meter
                            value={avg}
                            max={20}
                            tone="neutral"
                            label={t('student.subject', { subject: s.subjectName })}
                          />
                          <span className="w-10 shrink-0 text-end font-mono text-sm font-medium tabular-nums">
                            {num(avg)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-text-muted">{t('student.noScore')}</span>
                      )}
                    </div>
                  </div>
                  <ul aria-label={t('student.list')} className="divide-y divide-border">
                    {list.map((g) => (
                      <li
                        key={g.examId}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-5"
                      >
                        <div className="min-w-0 flex-1 basis-48">
                          <p className="truncate font-medium">
                            <bdi>{g.title}</bdi>
                          </p>
                          <p className="text-xs text-text-muted">
                            {f.dateTime(new Date(`${g.examDate}T12:00:00Z`), {
                              dateStyle: 'medium',
                              timeZone: 'UTC',
                            })}{' '}
                            · {t('row.coef', { value: g.coefficient })}
                          </p>
                          {g.remark ? (
                            <p className="mt-1 text-sm text-text-muted">{g.remark}</p>
                          ) : null}
                        </div>
                        {g.absent ? (
                          <Badge tone="warning">{t('student.absent')}</Badge>
                        ) : (
                          <p className="font-mono text-lg tabular-nums">
                            {g.score === null ? t('student.noScore') : num(g.score)}
                            <span className="text-sm text-text-muted">/{num(g.maxScore)}</span>
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

// Re-exported so a future report card can reuse the exact same averaging as this page.
export { weightedAverage20 };
