import {
  addDays,
  ATTENDANCE_EDIT_WINDOW_DAYS,
  getRollCall,
  isIsoDate,
  timeRange,
  todayIn,
  utcDate,
  weekdayOf,
} from '@tadriss/shared';
import { ArrowLeft } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { subjectTone } from '../schedule/colors';
import { cx } from '../ui/cx';
import type { AttendanceArea } from './attendance-day-page';
import { RollCallForm, type ReadOnlyReason } from './roll-call-form';

export async function RollCallPage({
  area,
  slotId,
  date: rawDate,
}: {
  area: AttendanceArea;
  slotId: string;
  date?: string;
}) {
  const viewer = await getViewer();
  const today = todayIn(viewer?.profile.institution?.timezone ?? 'Africa/Casablanca');
  const date = isIsoDate(rawDate) ? rawDate : today;
  const base = area === 'admin' ? '/dashboard/attendance' : '/teacher/attendance';

  const supabase = await getServerClient();
  const [t, f, res] = await Promise.all([
    getTranslations('attendance'),
    getFormatter(),
    getRollCall(supabase, slotId, date),
  ]);

  // A lesson that does not exist for this viewer, or does not run on that weekday.
  if (!res.ok || weekdayOf(date) !== res.data.slot.weekday) {
    return (
      <div className="mx-auto grid grid-cols-1 max-w-3xl gap-7">
        <Card>
          <EmptyState
            heading="h1"
            title={t('rollcall.notFound.title')}
            description={t('rollcall.notFound.body')}
            action={
              <Link
                href={base}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {t('rollcall.back')}
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const { slot, students } = res.data;
  const isTeacher = area === 'teacher';
  const readOnly: ReadOnlyReason | null =
    date > today
      ? 'future'
      : isTeacher && slot.teacherId !== viewer?.session.userId
        ? 'other'
        : isTeacher && date < addDays(today, -ATTENDANCE_EDIT_WINDOW_DAYS)
          ? 'old'
          : null;

  return (
    <div className="mx-auto grid grid-cols-1 max-w-3xl gap-6">
      <Link
        href={{ pathname: base, query: { date } }}
        className="inline-flex w-fit items-center gap-2 text-sm text-text-muted hover:text-primary"
      >
        <ArrowLeft className="rtl-flip size-4" aria-hidden />
        {t('rollcall.back')}
      </Link>

      <header>
        <p className="eyebrow">{t('rollcall.title')}</p>
        <h1 className="display mt-3 text-3xl md:text-4xl">
          <bdi>{slot.subjectName}</bdi> · <bdi>{slot.className}</bdi>
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-text-muted">
          <span className="capitalize">
            {f.dateTime(utcDate(date), {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone: 'UTC',
            })}
          </span>
          <span
            className={cx(
              'rounded-md border px-2 py-0.5 font-mono text-xs tabular-nums',
              subjectTone[slot.subjectColor],
            )}
          >
            {timeRange(slot)}
          </span>
        </p>
      </header>

      {students.length === 0 ? (
        <Card>
          <EmptyState
            title={t('rollcall.noStudents.title')}
            description={t('rollcall.noStudents.body')}
          />
        </Card>
      ) : (
        <RollCallForm slotId={slot.id} date={date} students={students} readOnly={readOnly} />
      )}
    </div>
  );
}
