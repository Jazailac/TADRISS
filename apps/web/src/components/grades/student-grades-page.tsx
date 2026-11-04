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
import { ScoreRuler } from './score-ruler';

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
  const [t, d, tr, shell, errors, f, grades, classes] = await Promise.all([
    getTranslations('grades'),
    getTranslations('domain'),
    getTranslations('report'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    listMyGrades(supabase, { studentId }),
    listClasses(supabase, { schoolYear: currentSchoolYear() }),
  ]);

  const head = (
    <header className="workspace-header">
      <p className="eyebrow">{shell('daily')}</p>
      <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
      <p className="mt-3 max-w-xl text-text-muted">{t('subtitle.student')}</p>
    </header>
  );

  if (!grades.ok) {
    return (
      <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-4xl gap-7">
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
    <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-4xl gap-7">
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
              className="workspace-tabs flex max-w-full w-fit flex-wrap gap-1 rounded-lg border border-border bg-surface-muted/60 p-1"
            >
              {tabs.map((x) => (
                <Link
                  key={x.key}
                  href={{ pathname: `${base}/grades`, query: x.q }}
                  aria-current={(term ? String(term) : 'all') === x.key ? 'page' : undefined}
                  className={cx(
                    'rounded-md px-4 py-2 text-sm font-medium transition-colors',
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

          <section className="grades-overview" aria-label={t('student.overall')}>
            <div className="grades-overview-primary">
              <p className="domain-kicker">{t('student.overall')}</p>
              <div>
                <span className="domain-count">
                  {overall === null ? t('student.noScore') : num(overall)}
                </span>
                <small>{t('row.out', { max: 20 })}</small>
              </div>
              {overall !== null ? (
                <div>
                  <Badge tone={overall >= 10 ? 'success' : 'warning'} dot>
                    {t(`student.mention.${mention(overall)}`)}
                  </Badge>
                </div>
              ) : null}
            </div>
            <div className="grades-overview-scale">
              {overall !== null ? (
                <ScoreRuler value={overall} label={d('scoreScale')} format={num} />
              ) : null}
              <p className="mt-5 text-xs leading-relaxed text-text-muted">{t('student.help')}</p>
            </div>
          </section>

          <section aria-label={t('student.bySubject')} className="grid gap-4">
            {subjects.map((s) => {
              const avg = perSubject.get(s.subjectId);
              const list = shown.filter((g) => g.subjectId === s.subjectId);
              return (
                <Card key={s.subjectId} className="grade-subject overflow-hidden">
                  <div className="grade-subject-header">
                    <div className="grade-subject-name">
                      <span aria-hidden className={subjectTone[s.subjectColor]} />
                      <div>
                        <h2>
                          <bdi>{s.subjectName}</bdi>
                        </h2>
                        <p className="mt-1 font-mono text-[0.625rem] text-text-muted">
                          {f.number(list.length)} · {t('student.exams')}
                        </p>
                      </div>
                    </div>
                    <div className="grade-subject-average">
                      <p className="grade-subject-caption">
                        {t('student.subject', { subject: s.subjectName })}
                      </p>
                      {avg !== undefined ? (
                        <>
                          <ScoreRuler
                            value={avg}
                            label={t('student.subject', { subject: s.subjectName })}
                            format={num}
                            compact
                          />
                          <span>{num(avg)}</span>
                        </>
                      ) : (
                        <span>{t('student.noScore')}</span>
                      )}
                    </div>
                  </div>
                  <ul aria-label={t('student.list')} className="divide-y divide-border">
                    {list.map((g) => (
                      <li key={g.examId} className="grade-exam-row">
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
                            <p className="mt-2 text-xs leading-relaxed text-text-muted" dir="auto">
                              {g.remark}
                            </p>
                          ) : null}
                        </div>
                        {g.absent ? (
                          <Badge tone="warning">{t('student.absent')}</Badge>
                        ) : (
                          <div className="grade-exam-result">
                            <p>
                              {g.score === null ? t('student.noScore') : num(g.score)}
                              <span> / {num(g.maxScore)}</span>
                            </p>
                            {g.score !== null ? (
                              <ScoreRuler
                                value={g.score}
                                max={g.maxScore}
                                label={`${g.title} · ${t('sheet.score')}`}
                                format={num}
                                compact
                              />
                            ) : null}
                          </div>
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
