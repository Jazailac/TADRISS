import { timeRange, type SlotView } from '@tadriss/shared';
import { getTranslations } from 'next-intl/server';
import { ArrowUpRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { subjectSwatch } from '../schedule/colors';
import { Badge } from '../ui/badge';
import { cx } from '../ui/cx';
import { bdi, EmptyLine } from './dash-parts';

export type TodayLesson = { slot: SlotView; taken?: boolean };

/**
 * Today's lessons in time order. `showRollCall` adds each lesson's roll-call state (teachers and
 * admins); `showTeacher` names the teacher (students and admins).
 */
export async function LessonsToday({
  lessons,
  showRollCall,
  showTeacher,
  base,
  date,
}: {
  lessons: TodayLesson[];
  showRollCall?: boolean;
  showTeacher?: boolean;
  base?: '/dashboard/attendance' | '/teacher/attendance';
  date?: string;
}) {
  const t = await getTranslations('dashboard.lessons');
  if (lessons.length === 0) return <EmptyLine>{t('none')}</EmptyLine>;
  return (
    <ul
      aria-label={t('list')}
      className="lesson-timeline grid grid-cols-1 divide-y divide-border/70"
    >
      {lessons.map(({ slot, taken }, index) => {
        const [start, end] = timeRange(slot).split('–');
        const content = (
          <>
            <span className="daily-lesson-time tabular-nums">
              <span>{start}</span>
              <span>{end}</span>
            </span>
            <div className="daily-lesson-detail">
              <span
                className={cx('daily-lesson-swatch', subjectSwatch[slot.subjectColor])}
                aria-hidden
              />
              <p dir="auto">
                <bdi>{slot.subjectName}</bdi>
              </p>
              <p>
                {t.rich('where', {
                  cls: slot.className,
                  n: bdi,
                })}
                {showTeacher && slot.teacherName ? (
                  <>
                    {' '}
                    · <bdi>{slot.teacherName}</bdi>
                  </>
                ) : null}
                {slot.room ? (
                  <>
                    {' '}
                    · <bdi>{slot.room}</bdi>
                  </>
                ) : null}
              </p>
            </div>
            <div className="daily-lesson-status">
              {showRollCall ? (
                <Badge tone={taken ? 'success' : 'warning'}>
                  {taken ? t('rollCallDone') : t('rollCallTodo')}
                </Badge>
              ) : (
                <span className="daily-lesson-number" aria-hidden>
                  {index + 1}
                </span>
              )}
              {base ? (
                <ArrowUpRight className="rtl-flip size-4 text-text-muted" aria-hidden />
              ) : null}
            </div>
          </>
        );
        return (
          <li key={slot.id}>
            {base && date ? (
              <Link href={`${base}/${slot.id}?date=${date}`} className="daily-lesson">
                {content}
              </Link>
            ) : (
              <div className="daily-lesson">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
