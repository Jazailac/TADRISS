import {
  currentSchoolYear,
  isSchoolYear,
  listClasses,
  schoolYearOptions,
  type ClassSummary,
} from '@tadriss/shared';
import { AlertCircle, ArrowUpRight, Search } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { Meter } from '../ui/meter';
import { Input, Select } from '../ui/field';
import { NewClassDialog } from './new-class-dialog';

export type ClassesSearchParams = { year?: string; q?: string; archived?: string };
export type ClassesArea = 'admin' | 'teacher';

const basePath = (area: ClassesArea) =>
  area === 'admin' ? '/dashboard/classes' : '/teacher/classes';

/** Admin and teacher share this screen; teachers see only the classes RLS lets them see. */
export async function ClassesPage({
  area,
  params,
}: {
  area: ClassesArea;
  params: ClassesSearchParams;
}) {
  const current = currentSchoolYear();
  const year = isSchoolYear(params.year) ? params.year : current;
  const archived = area === 'admin' && params.archived === '1';
  const q = (params.q ?? '').slice(0, 80);
  const years = [...new Set([...schoolYearOptions(), year])].sort();

  const supabase = await getServerClient();
  const [t, d, shell, errors, f, res] = await Promise.all([
    getTranslations('classes'),
    getTranslations('domain'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    listClasses(supabase, { schoolYear: year, q, archived }),
  ]);

  const header = (
    <header className="workspace-header flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow">{shell('school')}</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
        <p className="mt-3 max-w-xl text-text-muted">{t(`subtitle.${area}`)}</p>
      </div>
      {area === 'admin' ? <NewClassDialog defaultYear={year} /> : null}
    </header>
  );

  if (!res.ok) {
    return (
      <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-6xl gap-7">
        {header}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink
            href={{ pathname: basePath(area), query: { year } }}
            variant="secondary"
            className="mt-2"
          >
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const filtering = q !== '';
  return (
    <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-6xl gap-7">
      {header}

      <Card className="workspace-toolbar p-4 sm:p-5">
        <form role="search" method="get" className="flex flex-wrap items-end gap-3">
          {archived ? <input type="hidden" name="archived" value="1" /> : null}
          <div className="grid gap-1.5">
            <label htmlFor="classes-year" className="text-sm font-medium">
              {t('filters.year')}
            </label>
            <Select id="classes-year" name="year" defaultValue={year} className="h-10 w-40">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid min-w-0 flex-1 basis-56 gap-1.5">
            <label htmlFor="classes-q" className="text-sm font-medium">
              {t('filters.searchLabel')}
            </label>
            <Input
              id="classes-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder={t('filters.search')}
              autoComplete="off"
              icon={<Search className="size-4" aria-hidden />}
              className="h-10"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-md bg-primary-soft px-4 text-sm font-medium text-primary hover:bg-primary-soft/70"
          >
            {t('filters.apply')}
          </button>
          {area === 'admin' ? (
            <Link
              href={{
                pathname: basePath(area),
                query: archived ? { year } : { year, archived: '1' },
              }}
              className="ms-auto h-10 content-center text-sm font-medium text-text-muted underline-offset-4 hover:text-text hover:underline"
            >
              {archived ? t('filters.active') : t('filters.archived')}
            </Link>
          ) : null}
        </form>
      </Card>

      {res.data.length === 0 ? (
        <Card>
          {filtering ? (
            <EmptyState
              title={t('noResults.title')}
              description={t('noResults.body')}
              action={
                <ButtonLink
                  href={{ pathname: basePath(area), query: { year } }}
                  variant="secondary"
                >
                  {t('noResults.clear')}
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState title={t(`empty.${area}.title`)} description={t(`empty.${area}.body`)} />
          )}
        </Card>
      ) : (
        <section>
          <div className="register-masthead">
            <h2>{d('classes', { count: res.data.length })}</h2>
            <p>
              {t('card.students', { count: res.data.reduce((sum, cls) => sum + cls.enrolled, 0) })}{' '}
              · <bdi>{year}</bdi>
            </p>
          </div>
          <ul className="class-register">
            {res.data.map((c, index) => (
              <li key={c.id}>
                <ClassCard
                  cls={c}
                  href={`${basePath(area)}/${c.id}`}
                  area={area}
                  t={t}
                  number={f.number(index + 1, { minimumIntegerDigits: 2 })}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ClassCard({
  cls,
  href,
  area,
  t,
  number,
}: {
  cls: ClassSummary;
  href: string;
  area: ClassesArea;
  t: Awaited<ReturnType<typeof getTranslations<'classes'>>>;
  number: string;
}) {
  const full = cls.capacity !== null && cls.enrolled >= cls.capacity;
  return (
    <Link href={href} className="class-register-row group">
      <span className="class-index" aria-hidden>
        {number}
      </span>
      <div className="class-register-title">
        <h2 className="display break-words transition-colors group-hover:text-primary">
          <bdi>{cls.name}</bdi>
        </h2>
        <p className="mt-2 font-mono text-xs text-text-muted">
          <bdi dir="ltr">{cls.schoolYear}</bdi>
        </p>
      </div>
      <div className="class-register-detail">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="primary">{cls.level ?? t('card.noLevel')}</Badge>
          {cls.archived ? <Badge tone="warning">{t('card.archived')}</Badge> : null}
          {full ? <Badge tone="accent">{t('card.full')}</Badge> : null}
        </div>
        <p className="mt-3 break-words text-xs leading-relaxed text-text-muted">
          {cls.teachers.length > 0 ? (
            <bdi>
              {cls.teachers
                .map((teacher) => `${teacher.firstName} ${teacher.lastName}`)
                .join(' · ')}
            </bdi>
          ) : (
            t('card.noTeacher')
          )}
        </p>
      </div>
      <div className="class-register-capacity">
        <p className="text-sm font-medium">{t('card.students', { count: cls.enrolled })}</p>
        {area === 'admin' && cls.capacity !== null ? (
          <>
            <Meter
              value={cls.enrolled}
              max={cls.capacity}
              label={t('card.seatsLabel')}
              className="mt-3 rounded-sm"
            />
            <p className="mt-2 font-mono text-xs text-text-muted">
              {t('card.seats', { enrolled: cls.enrolled, capacity: cls.capacity })}
            </p>
          </>
        ) : null}
      </div>
      <span className="class-register-arrow text-text-muted transition-colors group-hover:text-primary">
        <ArrowUpRight className="rtl-flip size-5" aria-hidden />
      </span>
    </Link>
  );
}
