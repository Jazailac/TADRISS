import { currentSchoolYear, listClasses, listExams } from '@tadriss/shared';
import { AlertCircle } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase/server';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { Select } from '../ui/field';
import { ExamRow } from './exam-row';

export type AdminGradesParams = { class?: string; term?: string };

/** The administration's overview: every exam, with class averages. Read-only (teachers own the marks). */
export async function AdminGradesPage({ params }: { params: AdminGradesParams }) {
  const supabase = await getServerClient();
  const term = params.term === '1' ? 1 : params.term === '2' ? 2 : undefined;
  const [t, shell, errors, f, classes] = await Promise.all([
    getTranslations('grades'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    listClasses(supabase, { schoolYear: currentSchoolYear() }),
  ]);
  const classId =
    classes.ok && classes.data.some((c) => c.id === params.class) ? params.class : undefined;
  const exams = await listExams(supabase, { classId, term });

  const head = (
    <header>
      <p className="eyebrow">{shell('daily')}</p>
      <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
      <p className="mt-3 max-w-xl text-text-muted">{t('subtitle.admin')}</p>
    </header>
  );

  if (!exams.ok || !classes.ok) {
    return (
      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-7">
        {head}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href="/dashboard/grades" variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const enrolled = new Map(classes.data.map((c) => [c.id, c.enrolled]));
  const published = exams.data.filter((x) => x.published);
  const averages = published.flatMap((x) => (x.stats?.avg20 != null ? [x.stats.avg20] : []));
  const schoolAverage = averages.length
    ? averages.reduce((a, b) => a + b, 0) / averages.length
    : null;
  const summary = [
    { key: 'exams', value: f.number(exams.data.length) },
    { key: 'published', value: f.number(published.length) },
    {
      key: 'average',
      value:
        schoolAverage === null
          ? t('admin.noAverage')
          : f.number(schoolAverage, { maximumFractionDigits: 2 }),
    },
  ] as const;

  return (
    <div className="mx-auto grid grid-cols-1 max-w-6xl gap-7">
      {head}
      <dl className="grid gap-4 sm:grid-cols-3">
        {summary.map((s) => (
          <Card key={s.key} className="p-5">
            <dt className="text-sm text-text-muted">{t(`admin.summary.${s.key}`)}</dt>
            <dd className="mt-2 font-mono text-3xl font-medium tabular-nums">{s.value}</dd>
          </Card>
        ))}
      </dl>

      <Card className="p-4 sm:p-5">
        <form method="get" className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
          <div className="grid gap-1.5 sm:w-52">
            <label htmlFor="grades-class" className="text-sm font-medium">
              {t('filters.class')}
            </label>
            <Select
              id="grades-class"
              name="class"
              defaultValue={classId ?? ''}
              className="h-10 w-52"
            >
              <option value="">{t('filters.allClasses')}</option>
              {classes.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5 sm:w-44">
            <label htmlFor="grades-term" className="text-sm font-medium">
              {t('filters.term')}
            </label>
            <Select
              id="grades-term"
              name="term"
              defaultValue={term ? String(term) : ''}
              className="h-10 w-44"
            >
              <option value="">{t('filters.all')}</option>
              <option value="1">{t('terms.1')}</option>
              <option value="2">{t('terms.2')}</option>
            </Select>
          </div>
          <button
            type="submit"
            className="h-10 rounded-md bg-primary-soft px-4 text-sm font-medium text-primary hover:bg-primary-soft/70"
          >
            {t('filters.apply')}
          </button>
        </form>
      </Card>

      {exams.data.length === 0 ? (
        <Card>
          <EmptyState title={t('empty.admin.title')} description={t('empty.admin.body')} />
        </Card>
      ) : (
        <ul aria-label={t('admin.table')} className="grid gap-3">
          {exams.data.map((x) => (
            <ExamRow
              key={x.id}
              exam={x}
              href={`/dashboard/grades/${x.id}`}
              total={enrolled.get(x.classId)}
              showTeacher
              t={t}
              f={f}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
