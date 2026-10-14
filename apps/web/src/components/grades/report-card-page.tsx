import {
  currentSchoolYear,
  countStatuses,
  attendanceRate,
  getReportStudent,
  listMyAttendance,
  listMyGrades,
  mention,
  overallAverage,
  subjectAverages,
  weightedAverage20,
  type MarkForAverage,
} from '@tadriss/shared';
import { ArrowLeft } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { PrintButton } from '../finance/print-button';
import { Logo } from '../ui/logo';

/** A printable report card (bulletin) for one student: marks per subject, average, mention, attendance. */
export async function ReportCardPage({
  studentId,
  term,
}: {
  studentId: string;
  term: 1 | 2 | null;
}) {
  const viewer = await getViewer();
  const supabase = await getServerClient();
  const [t, g, f, student, grades, attendance] = await Promise.all([
    getTranslations('report'),
    getTranslations('grades'),
    getFormatter(),
    getReportStudent(supabase, studentId),
    listMyGrades(supabase, { studentId }),
    listMyAttendance(supabase, { studentId, limit: 500 }),
  ]);
  if (!student.ok || !grades.ok) notFound();

  const role = viewer?.session.role;
  const back =
    role === 'parent'
      ? `/parent/grades?child=${studentId}`
      : role === 'student'
        ? '/student/grades'
        : role === 'teacher'
          ? '/teacher/grades'
          : '/dashboard/grades';

  const shown = term ? grades.data.filter((x) => x.term === term) : grades.data;
  const toMark = (x: (typeof shown)[number]): MarkForAverage => ({
    subjectId: x.subjectId,
    score: x.score,
    absent: x.absent,
    maxScore: x.maxScore,
    coefficient: x.coefficient,
  });
  const marks = shown.map(toMark);
  const overall = overallAverage(marks);
  const perSubject = subjectAverages(marks);
  const subjects = [...new Map(shown.map((x) => [x.subjectId, x])).values()].sort((a, b) =>
    a.subjectName.localeCompare(b.subjectName),
  );
  const num = (n: number) => f.number(n, { maximumFractionDigits: 2 });
  const counts = attendance.ok ? countStatuses(attendance.data) : null;
  const rate = counts ? attendanceRate(counts) : null;
  const name = `${student.data.firstName} ${student.data.lastName}`.trim();
  const school = viewer?.profile.institution?.name ?? '';

  return (
    <main className="mx-auto grid max-w-3xl grid-cols-1 gap-5 px-4 py-8 print:max-w-none print:p-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href={back}
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary"
        >
          <ArrowLeft className="rtl-flip size-4" aria-hidden />
          {t('back')}
        </Link>
        <PrintButton />
      </div>

      <article
        aria-label={t('title')}
        className="rounded-2xl border border-border bg-surface p-8 shadow-md print:rounded-none print:border-0 print:p-0 print:shadow-none"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <Logo />
            <p className="mt-3 font-semibold">
              <bdi>{school}</bdi>
            </p>
          </div>
          <div className="text-end">
            <h1 className="display text-3xl">{t('title')}</h1>
            <p className="mt-1 text-sm text-text-muted">
              {term ? g(`terms.${term}`) : t('year')} · {currentSchoolYear()}
            </p>
          </div>
        </header>

        <dl className="mt-6 grid gap-2 text-sm">
          <div className="grid grid-cols-[8rem_1fr] gap-4">
            <dt className="text-text-muted">{t('student')}</dt>
            <dd className="font-medium">
              <bdi>{name}</bdi>
            </dd>
          </div>
          <div className="grid grid-cols-[8rem_1fr] gap-4">
            <dt className="text-text-muted">{t('class')}</dt>
            <dd className="font-medium">
              <bdi>{student.data.className ?? '—'}</bdi>
            </dd>
          </div>
        </dl>

        {subjects.length === 0 ? (
          <p className="mt-8 rounded-lg bg-surface-muted p-4 text-sm text-text-muted">
            {t('empty')}
          </p>
        ) : (
          <table className="mt-8 w-full text-sm">
            <caption className="sr-only">{t('table')}</caption>
            <thead>
              <tr className="border-b border-border-strong text-start text-text-muted">
                <th scope="col" className="py-2 text-start font-medium">
                  {t('subject')}
                </th>
                <th scope="col" className="py-2 text-end font-medium">
                  {t('coefficient')}
                </th>
                <th scope="col" className="py-2 text-end font-medium">
                  {t('average')}
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => {
                const own = shown.filter((x) => x.subjectId === s.subjectId);
                const coef = own.reduce((a, x) => a + x.coefficient, 0);
                const avg = perSubject.get(s.subjectId) ?? weightedAverage20(own.map(toMark));
                return (
                  <tr key={s.subjectId} className="border-b border-border">
                    <th scope="row" className="py-2 text-start font-medium">
                      <bdi>{s.subjectName}</bdi>
                    </th>
                    <td className="py-2 text-end font-mono tabular-nums">{num(coef)}</td>
                    <td className="py-2 text-end font-mono tabular-nums">
                      {avg === null ? '—' : num(avg)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <section className="mt-8 grid gap-4 rounded-xl bg-surface-muted p-6 print:border print:border-border print:bg-transparent sm:grid-cols-2">
          <div>
            <p className="text-sm text-text-muted">{t('overall')}</p>
            <p className="mt-1 font-mono text-3xl font-medium tabular-nums">
              {overall === null ? '—' : `${num(overall)} / 20`}
            </p>
            {overall === null ? null : (
              <p className="mt-1 text-sm font-medium">{g(`student.mention.${mention(overall)}`)}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-text-muted">{t('attendance')}</p>
            <p className="mt-1 font-mono text-3xl font-medium tabular-nums">
              {rate === null ? '—' : `${f.number(Math.round(rate))} %`}
            </p>
            {counts ? (
              <p className="mt-1 text-sm text-text-muted">
                {t('absences', { absent: counts.absent, late: counts.late })}
              </p>
            ) : null}
          </div>
        </section>

        <footer className="mt-12 flex items-end justify-between gap-6 text-xs text-text-muted">
          <p>{t('footer')}</p>
          <p className="w-48 border-t border-border-strong pt-2 text-center">{t('signature')}</p>
        </footer>
      </article>
    </main>
  );
}
