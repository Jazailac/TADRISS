import {
  minutesToTime,
  timeRange,
  weekdays,
  type SlotView,
  type Subject,
  type Weekday,
} from '@tadriss/shared';
import { getFormatter, getTranslations } from 'next-intl/server';
import { cx } from '../ui/cx';
import { subjectTone } from './colors';
import { LessonBlockButton, type TeacherOption } from './lesson-dialog';

/** Pixels per minute: a 60-minute lesson is 90px tall, enough for subject, time, teacher and room. */
const PX_PER_MIN = 1.5;

export type Editable = { classId: string; subjects: Subject[]; teachers: TeacherOption[] };

/**
 * Weekly timetable. Desktop: a time grid with lessons positioned by their real start/end.
 * Small screens: an agenda grouped by day (a 6-column grid does not fit a phone).
 * With `editable`, each lesson opens its edit dialog.
 */
export async function WeekTimetable({
  slots,
  detail,
  editable,
}: {
  slots: SlotView[];
  /** Second line of each lesson: who teaches it, or which class it is. */
  detail: 'teacher' | 'class' | 'both';
  editable?: Editable;
}) {
  const [t, f] = await Promise.all([getTranslations('schedule'), getFormatter()]);

  // 2024-01-01 is a Monday: index d-1 gives the weekday name in the viewer's locale.
  const dayName = (d: number, style: 'long' | 'short') =>
    f.dateTime(new Date(Date.UTC(2024, 0, d)), { weekday: style, timeZone: 'UTC' });
  const weekdayNames = weekdays.map((d) => dayName(d, 'long'));

  const shown: Weekday[] = weekdays.filter((d) => d <= 5 || slots.some((s) => s.weekday === d));
  const first = Math.min(8 * 60, ...slots.map((s) => s.startMin));
  const last = Math.max(17 * 60, ...slots.map((s) => s.endMin));
  const start = Math.floor(first / 60) * 60;
  const end = Math.ceil(last / 60) * 60;
  const hours = Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60);
  const height = (end - start) * PX_PER_MIN;

  const secondLine = (s: SlotView) =>
    detail === 'teacher'
      ? s.teacherName
      : detail === 'class'
        ? s.className
        : `${s.className} · ${s.teacherName}`;

  const label = (s: SlotView) =>
    t('grid.open', {
      subject: s.subjectName,
      day: dayName(s.weekday, 'long'),
      time: timeRange(s),
    });

  const body = (s: SlotView, compact: boolean) => (
    <span className="flex h-full flex-col gap-0.5 overflow-hidden px-2 py-1.5">
      <span className="truncate text-sm font-semibold">
        <bdi>{s.subjectName}</bdi>
      </span>
      <span className="font-mono text-[0.6875rem] tabular-nums opacity-80">{timeRange(s)}</span>
      {!compact ? (
        <span className="truncate text-xs opacity-90">
          <bdi>{secondLine(s)}</bdi>
        </span>
      ) : null}
      {!compact && s.room ? (
        <span className="truncate text-xs opacity-80">{t('grid.room', { room: s.room })}</span>
      ) : null}
    </span>
  );

  const wrap = (s: SlotView, compact: boolean, className: string) =>
    editable ? (
      <LessonBlockButton
        slot={s}
        label={label(s)}
        className={className}
        classId={editable.classId}
        subjects={editable.subjects}
        teachers={editable.teachers}
        weekdayNames={weekdayNames}
      >
        {body(s, compact)}
      </LessonBlockButton>
    ) : (
      <div className={cx('h-full w-full', className)}>{body(s, compact)}</div>
    );

  return (
    <>
      {/* Desktop grid */}
      <div
        role="group"
        aria-label={t('grid.label')}
        className="hidden overflow-x-auto rounded-xl border border-border bg-surface shadow-sm md:block"
      >
        <div
          className="grid min-w-[44rem]"
          style={{ gridTemplateColumns: `3.5rem repeat(${shown.length}, minmax(0, 1fr))` }}
        >
          <div className="border-b border-border" />
          {shown.map((d) => (
            <div
              key={d}
              className="border-b border-s border-border px-2 py-3 text-center text-sm font-medium"
            >
              {dayName(d, 'long')}
            </div>
          ))}

          <div className="relative" style={{ height }}>
            {hours.map((h) => (
              <span
                key={h}
                className="absolute end-2 -translate-y-1/2 font-mono text-[0.6875rem] tabular-nums text-text-muted first:translate-y-0"
                style={{ top: (h - start) * PX_PER_MIN }}
              >
                {minutesToTime(h)}
              </span>
            ))}
          </div>
          {shown.map((d) => (
            <div key={d} className="relative border-s border-border" style={{ height }}>
              {hours.map((h) => (
                <div
                  key={h}
                  aria-hidden
                  className="absolute inset-x-0 border-t border-border/60"
                  style={{ top: (h - start) * PX_PER_MIN }}
                />
              ))}
              {slots
                .filter((s) => s.weekday === d)
                .map((s) => (
                  <div
                    key={s.id}
                    className="absolute inset-x-1"
                    style={{
                      top: (s.startMin - start) * PX_PER_MIN + 1,
                      height: (s.endMin - s.startMin) * PX_PER_MIN - 2,
                    }}
                  >
                    {wrap(
                      s,
                      s.endMin - s.startMin < 50,
                      cx('overflow-hidden rounded-lg border', subjectTone[s.subjectColor]),
                    )}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* Phone agenda */}
      <div className="grid gap-5 md:hidden" role="group" aria-label={t('grid.agenda')}>
        {shown.map((d) => {
          const day = slots.filter((s) => s.weekday === d);
          if (day.length === 0) return null;
          return (
            <section key={d} aria-label={dayName(d, 'long')}>
              <h3 className="eyebrow mb-2">{dayName(d, 'long')}</h3>
              <ul className="grid gap-2">
                {day.map((s) => (
                  <li key={s.id} className="min-h-16">
                    {wrap(
                      s,
                      false,
                      cx('overflow-hidden rounded-xl border', subjectTone[s.subjectColor]),
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
