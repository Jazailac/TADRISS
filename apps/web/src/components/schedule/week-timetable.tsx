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
  const [t, d, f] = await Promise.all([
    getTranslations('schedule'),
    getTranslations('domain'),
    getFormatter(),
  ]);

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
  const halfHours = Array.from(
    { length: (end - start) / 30 },
    (_, i) => start + i * 30 + 30,
  ).filter((minute) => minute < end && minute % 60 !== 0);
  const totalHours =
    Math.round((slots.reduce((sum, slot) => sum + slot.endMin - slot.startMin, 0) / 60) * 100) /
    100;
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
    <span className="flex h-full flex-col gap-0.5 overflow-hidden px-3 py-2 md:px-2 md:py-1.5">
      <span className="truncate text-sm font-semibold">
        <bdi>{s.subjectName}</bdi>
      </span>
      <span className="lesson-range font-mono text-[0.6875rem] tabular-nums opacity-80">
        {timeRange(s)}
      </span>
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
    <div className="timetable-stage">
      <div className="timetable-masthead">
        <h2>{t('grid.label')}</h2>
        <div>
          <span>{d('lessons', { count: slots.length })}</span>
          <span>{d('weekHours', { hours: totalHours })}</span>
        </div>
      </div>
      {/* Desktop grid */}
      <div
        role="group"
        aria-label={t('grid.label')}
        className="timetable-grid hidden overflow-x-auto rounded-2xl border border-border bg-surface shadow-xs md:block"
      >
        <div
          className="grid min-w-[44rem]"
          style={{ gridTemplateColumns: `3.5rem repeat(${shown.length}, minmax(0, 1fr))` }}
        >
          <div className="border-b border-border bg-surface-muted/60" />
          {shown.map((d) => (
            <div
              key={d}
              className="timetable-day-heading border-b border-s border-border bg-surface-muted/60"
            >
              <span aria-hidden>{f.number(d, { minimumIntegerDigits: 2 })}</span>
              <strong>{dayName(d, 'long')}</strong>
              <span>
                {slots.filter((slot) => slot.weekday === d).length > 0
                  ? f.number(slots.filter((slot) => slot.weekday === d).length)
                  : t('grid.noLessons')}
              </span>
            </div>
          ))}

          <div className="relative bg-surface-muted/30" style={{ height }}>
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
            <div key={d} className="relative border-s border-border/70" style={{ height }}>
              {halfHours.map((minute) => (
                <div
                  key={minute}
                  aria-hidden
                  className="absolute inset-x-0 border-t border-border/25"
                  style={{ top: (minute - start) * PX_PER_MIN }}
                />
              ))}
              {hours.map((h) => (
                <div
                  key={h}
                  aria-hidden
                  className="absolute inset-x-0 border-t border-dashed border-border/70"
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
                      cx(
                        'timetable-slot overflow-hidden rounded-lg border border-s-[3px] shadow-xs transition-opacity hover:opacity-80',
                        subjectTone[s.subjectColor],
                      ),
                    )}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* Phone agenda */}
      <div className="grid gap-6 md:hidden" role="group" aria-label={t('grid.agenda')}>
        {shown.map((weekday) => {
          const day = slots.filter((s) => s.weekday === weekday);
          if (day.length === 0) return null;
          return (
            <section key={weekday} aria-label={dayName(weekday, 'long')}>
              <div className="agenda-day-heading">
                <span className="domain-count" aria-hidden>
                  {f.number(weekday, { minimumIntegerDigits: 2 })}
                </span>
                <h3>{dayName(weekday, 'long')}</h3>
                <p>{d('lessons', { count: day.length })}</p>
              </div>
              <ul className="grid gap-2">
                {day.map((s) => (
                  <li key={s.id} className="agenda-lesson min-h-16">
                    <div className="agenda-time">
                      <span>{minutesToTime(s.startMin)}</span>
                      <span>{minutesToTime(s.endMin)}</span>
                    </div>
                    {wrap(
                      s,
                      false,
                      cx(
                        'timetable-slot overflow-hidden rounded-xl border border-s-[3px] shadow-xs',
                        subjectTone[s.subjectColor],
                      ),
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
