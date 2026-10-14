import { timeRange, type SlotView } from '@tadriss/shared';
import { getTranslations } from 'next-intl/server';
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
}: {
  lessons: TodayLesson[];
  showRollCall?: boolean;
  showTeacher?: boolean;
}) {
  const t = await getTranslations('dashboard.lessons');
  if (lessons.length === 0) return <EmptyLine>{t('none')}</EmptyLine>;
  return (
    <ul aria-label={t('list')} className="grid grid-cols-1 divide-y divide-border">
      {lessons.map(({ slot, taken }) => (
        <li key={slot.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3">
          <span
            aria-hidden
            className={cx('h-9 w-1 shrink-0 rounded-full', subjectSwatch[slot.subjectColor])}
          />
          <span className="w-24 shrink-0 font-mono text-sm tabular-nums">{timeRange(slot)}</span>
          <div className="min-w-0 flex-1 basis-40">
            <p className="truncate font-medium">
              <bdi>{slot.subjectName}</bdi>
            </p>
            <p className="truncate text-sm text-text-muted">
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
          {showRollCall ? (
            <Badge tone={taken ? 'success' : 'warning'}>
              {taken ? t('rollCallDone') : t('rollCallTodo')}
            </Badge>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
