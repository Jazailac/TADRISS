import { getClass, listPeople, listRoster } from '@tadriss/shared';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { ArchiveButton } from './archive-button';
import type { ClassesArea } from './classes-page';
import { EditClassDialog } from './edit-class-dialog';
import { EnrolDialog } from './enrol-dialog';
import { TeachersDialog } from './teachers-dialog';
import { WithdrawButton } from './withdraw-button';

export async function ClassDetail({ id, area }: { id: string; area: ClassesArea }) {
  const supabase = await getServerClient();
  const admin = area === 'admin';
  const [t, f, errors, cls, roster, teacherPool] = await Promise.all([
    getTranslations('classes'),
    getFormatter(),
    getTranslations('errors'),
    getClass(supabase, id),
    listRoster(supabase, id),
    admin
      ? listPeople(supabase, { role: 'teacher', status: 'active', pageSize: 100 })
      : Promise.resolve(null),
  ]);

  if (!cls.ok && cls.error === 'not_found') notFound();
  const back = admin ? '/dashboard/classes' : '/teacher/classes';

  if (!cls.ok || !roster.ok || (teacherPool && !teacherPool.ok)) {
    return (
      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-7">
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h1 className="display text-2xl">{t('error.title')}</h1>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href={`${back}/${id}`} variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const c = cls.data;
  const full = c.capacity !== null && c.enrolled >= c.capacity;
  const seatsLeft = c.capacity === null ? null : Math.max(0, c.capacity - c.enrolled);
  const teacherOptions =
    teacherPool?.ok === true
      ? teacherPool.data.rows.map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
        }))
      : [];

  return (
    <div className="mx-auto grid grid-cols-1 max-w-6xl gap-7">
      <Link
        href={back}
        className="inline-flex w-fit items-center gap-2 text-sm text-text-muted hover:text-primary"
      >
        <ArrowLeft className="rtl-flip size-4" aria-hidden />
        {t('detail.back')}
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="primary">{c.level ?? t('card.noLevel')}</Badge>
            <Badge>
              {t.rich('detail.year', {
                year: c.schoolYear,
                y: (chunks) => <bdi dir="ltr">{chunks}</bdi>,
              })}
            </Badge>
            {c.archived ? <Badge tone="warning">{t('card.archived')}</Badge> : null}
            {full ? <Badge tone="accent">{t('card.full')}</Badge> : null}
          </div>
          <h1 className="display mt-4 text-4xl md:text-5xl">
            <bdi>{c.name}</bdi>
          </h1>
        </div>
        {admin ? (
          <div className="flex flex-wrap items-center gap-2">
            <EditClassDialog id={c.id} name={c.name} level={c.level} capacity={c.capacity} />
            <ArchiveButton id={c.id} archived={c.archived} />
          </div>
        ) : null}
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5 sm:px-6">
            <div>
              <h2 className="font-semibold">{t('roster.title')}</h2>
              <p className="mt-1 font-mono text-xs text-text-muted">
                {c.capacity === null
                  ? t('card.students', { count: c.enrolled })
                  : t('card.seats', { enrolled: c.enrolled, capacity: c.capacity })}
              </p>
            </div>
            {admin && !c.archived ? (
              <EnrolDialog classId={c.id} schoolYear={c.schoolYear} seatsLeft={seatsLeft} />
            ) : null}
          </div>
          {roster.data.length === 0 ? (
            <EmptyState
              heading="h2"
              title={t('roster.empty')}
              description={admin ? t('roster.emptyBody') : t('empty.teacher.body')}
            />
          ) : (
            <ul aria-label={t('roster.list')} className="divide-y divide-border">
              {roster.data.map((s) => (
                <li
                  key={s.enrolmentId}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 sm:px-6"
                >
                  <Avatar first={s.firstName} last={s.lastName} seed={s.studentId} />
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate font-medium">
                      <bdi>
                        {s.firstName} {s.lastName}
                      </bdi>
                    </p>
                    {s.email ? (
                      <p className="truncate text-sm text-text-muted">
                        <bdi>{s.email}</bdi>
                      </p>
                    ) : null}
                  </div>
                  <span className="font-mono text-xs text-text-muted">
                    {t('roster.since', {
                      date: f.dateTime(new Date(s.enrolledOn), { dateStyle: 'medium' }),
                    })}
                  </span>
                  {admin && !c.archived ? (
                    <WithdrawButton
                      enrolmentId={s.enrolmentId}
                      name={`${s.firstName} ${s.lastName}`}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border p-5">
            <h2 className="font-semibold">{t('teachers.title')}</h2>
            {admin && !c.archived ? (
              <TeachersDialog
                classId={c.id}
                options={teacherOptions}
                selected={c.teachers.map((x) => x.id)}
              />
            ) : null}
          </div>
          {c.teachers.length === 0 ? (
            <p className="p-5 text-sm text-text-muted">{t('teachers.empty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {c.teachers.map((x) => (
                <li key={x.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar
                    first={x.firstName}
                    last={x.lastName}
                    seed={x.id}
                    className="size-9 text-xs"
                  />
                  <span className="min-w-0 truncate text-sm font-medium">
                    <bdi>
                      {x.firstName} {x.lastName}
                    </bdi>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
