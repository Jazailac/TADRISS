import {
  attendanceRate,
  countStatuses,
  listMyAttendance,
  timeRange,
  utcDate,
} from '@tadriss/shared';
import { AlertCircle } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase/server';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';
import { subjectTone } from '../schedule/colors';
import { statusMeta } from './status';

/** A student's own attendance: headline numbers and a dated history. */
export async function MyAttendancePage({
  studentId,
  base = '/student',
}: {
  /** A parent looks at one child; a student's own page needs none. */
  studentId?: string;
  base?: string;
} = {}) {
  const supabase = await getServerClient();
  const [t, shell, errors, f, res] = await Promise.all([
    getTranslations('attendance'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    listMyAttendance(supabase, { studentId }),
  ]);

  const header = (
    <header>
      <p className="eyebrow">{shell('daily')}</p>
      <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
      <p className="mt-3 max-w-xl text-text-muted">{t('subtitle.student')}</p>
    </header>
  );

  if (!res.ok) {
    return (
      <div className="mx-auto grid grid-cols-1 max-w-4xl gap-7">
        {header}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href={`${base}/attendance`} variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const counts = countStatuses(res.data);
  const rate = attendanceRate(counts);
  const stats = [
    { key: 'rate', value: rate === null ? '—' : f.number(rate / 100, { style: 'percent' }) },
    { key: 'absences', value: f.number(counts.absent + counts.excused) },
    { key: 'lates', value: f.number(counts.late) },
  ] as const;

  return (
    <div className="mx-auto grid grid-cols-1 max-w-4xl gap-7">
      {header}
      <dl className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.key} className="p-5">
            <dt className="text-sm text-text-muted">{t(`mine.stats.${s.key}`)}</dt>
            <dd className="mt-2 font-mono text-3xl font-medium tabular-nums">{s.value}</dd>
          </Card>
        ))}
      </dl>
      <p className="-mt-3 text-xs text-text-muted">{t('summary.help')}</p>

      <Card className="overflow-hidden">
        <div className="border-b border-border p-5 sm:px-6">
          <h2 className="font-semibold">{t('mine.list')}</h2>
        </div>
        {res.data.length === 0 ? (
          <EmptyState title={t('mine.empty.title')} description={t('mine.empty.body')} />
        ) : (
          <ul aria-label={t('mine.list')} className="divide-y divide-border">
            {res.data.slice(0, 100).map((e) => (
              <li
                key={e.sessionId}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 sm:px-6"
              >
                <p className="w-40 shrink-0 text-sm capitalize">
                  {f.dateTime(utcDate(e.date), {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    timeZone: 'UTC',
                  })}
                </p>
                <div className="min-w-0 flex-1 basis-40">
                  <span
                    className={cx(
                      'inline-block max-w-full truncate rounded-md border px-2 py-0.5 text-sm font-medium',
                      subjectTone[e.subjectColor],
                    )}
                  >
                    <bdi>{e.subjectName}</bdi>
                  </span>
                  <span className="ms-2 font-mono text-xs tabular-nums text-text-muted">
                    {timeRange(e)}
                  </span>
                  {e.note ? <p className="mt-1 text-sm text-text-muted">{e.note}</p> : null}
                </div>
                <Badge tone={statusMeta[e.status].tone} dot>
                  {t(`status.${e.status}`)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
