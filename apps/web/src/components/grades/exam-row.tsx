import type { ExamView } from '@tadriss/shared';
import type { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { subjectTone } from '../schedule/colors';
import { Badge } from '../ui/badge';
import { cx } from '../ui/cx';
import { Meter } from '../ui/meter';

type T = Awaited<ReturnType<typeof getTranslations<'grades'>>>;
type F = Awaited<ReturnType<typeof getFormatter>>;

/** One exam in a list: subject, title, class, date, scale, status, progress and class average. */
export function ExamRow({
  exam: x,
  href,
  total,
  showTeacher,
  t,
  f,
}: {
  exam: ExamView;
  href: string;
  /** Students in the class, for the "graded / total" progress. */
  total: number | undefined;
  showTeacher?: boolean;
  t: T;
  f: F;
}) {
  const graded = x.stats?.graded ?? 0;
  const avg = x.stats?.avg20 ?? null;
  return (
    <li>
      <Link
        href={href}
        className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm transition-[box-shadow,border-color] hover:border-border-strong hover:shadow-md sm:px-5"
      >
        <span
          className={cx(
            'max-w-full shrink-0 truncate rounded-lg border px-3 py-1.5 text-sm font-semibold sm:w-36',
            subjectTone[x.subjectColor],
          )}
        >
          <bdi>{x.subjectName}</bdi>
        </span>
        <div className="min-w-0 flex-1 basis-48">
          <p className="truncate font-medium">
            <bdi>{x.title}</bdi>
          </p>
          <p className="text-sm text-text-muted sm:truncate">
            <bdi>{x.className}</bdi>
            {' · '}
            {f.dateTime(new Date(`${x.examDate}T12:00:00Z`), {
              dateStyle: 'medium',
              timeZone: 'UTC',
            })}
            {' · '}
            {t('row.coef', { value: x.coefficient })} {t('row.out', { max: x.maxScore })}
            {showTeacher ? (
              <>
                {' · '}
                {t('row.teacher', { name: x.teacherName })}
              </>
            ) : null}
          </p>
        </div>
        <Badge tone={x.published ? 'success' : 'neutral'} dot>
          {x.published ? t('status.published') : t('status.draft')}
        </Badge>
        <div className="flex w-full min-w-0 items-center gap-3 sm:w-44">
          {avg !== null ? (
            <>
              <Meter value={avg} max={20} tone="neutral" label={t('detail.stats.average')} />
              <span className="w-10 shrink-0 text-end font-mono text-sm tabular-nums">
                {f.number(avg, { maximumFractionDigits: 2 })}
              </span>
            </>
          ) : (
            <span className="text-sm text-text-muted">{t('row.noAverage')}</span>
          )}
        </div>
        <span className="font-mono text-xs tabular-nums text-text-muted sm:w-20 sm:shrink-0 sm:text-end">
          {total !== undefined
            ? t('row.progress', { graded, total })
            : t('row.progressOnly', { graded })}
        </span>
      </Link>
    </li>
  );
}
