import {
  formatMoney,
  minutesToTime,
  type ClassSummary,
  type DayLesson,
  type OverdueStudent,
} from '@tadriss/shared';
import { ChevronRight } from 'lucide-react';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { Fragment, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { Badge } from '../ui/badge';
import { cx } from '../ui/cx';
import { EmptyLine, Panel } from './dash-parts';

type QueueKey = 'rollCalls' | 'overdue' | 'messages' | 'classes' | 'invitations';
type QueueRow = {
  key: string;
  group: QueueKey;
  href: string;
  title: ReactNode;
  detail: ReactNode;
  badge?: ReactNode;
  tone: 'danger' | 'warning' | 'info';
};

const dotTones: Record<QueueRow['tone'], string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
};

// TODO(human): order what a director should deal with first.
const queueOrder: readonly QueueKey[] = [
  'rollCalls',
  'overdue',
  'messages',
  'classes',
  'invitations',
];

/** How many students are named before the rest collapse into one "and N more" row. */
const NAMED_STUDENTS = 3;

/** What needs the administration's attention today, each row leading to where it gets done. */
export async function NeedsToday({
  late,
  overdue,
  unreadMessages,
  today,
  classesWithoutTeacher,
  expiredInvitations,
  invitationsHref,
  incomplete,
}: {
  late: DayLesson[];
  overdue: OverdueStudent[];
  unreadMessages: number;
  /** The school's calendar day, for the roll-call link. */
  today: string;
  classesWithoutTeacher: ClassSummary[];
  expiredInvitations: number;
  invitationsHref: string;
  /** A source failed to load: never present what is left as an all-clear. */
  incomplete: boolean;
}) {
  const [t, f, locale] = await Promise.all([
    getTranslations('dashboard.admin.queue'),
    getFormatter(),
    getLocale(),
  ]);
  const shortDate = (iso: string) =>
    f.dateTime(new Date(`${iso}T12:00:00Z`), {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });

  const firstLate = late[0];
  const namedOverdue = overdue.slice(0, NAMED_STUDENTS);
  const otherOverdue = overdue.length - namedOverdue.length;
  const firstClass = classesWithoutTeacher[0];

  const rows: QueueRow[] = [
    ...(firstLate
      ? [
          {
            key: 'rollCalls',
            group: 'rollCalls' as const,
            href:
              late.length === 1
                ? `/dashboard/attendance/${firstLate.slot.id}?date=${today}`
                : '/dashboard/attendance',
            title: t('lateRollCalls', { count: late.length }),
            detail: (
              <>
                <bdi>{firstLate.slot.subjectName}</bdi> ·{' '}
                {t.rich('lateDetail', {
                  time: minutesToTime(firstLate.slot.endMin),
                  mono: (chunks) => <span className="font-mono tabular-nums">{chunks}</span>,
                })}
              </>
            ),
            tone: 'danger' as const,
          },
        ]
      : []),
    ...namedOverdue.map((student) => ({
      key: `overdue-${student.studentId}`,
      group: 'overdue' as const,
      href: `/dashboard/finance?status=overdue&q=${encodeURIComponent(student.lastName)}`,
      title: (
        <bdi>
          {student.firstName} {student.lastName}
        </bdi>
      ),
      detail: t('overdueDetail', {
        count: student.invoices,
        date: shortDate(student.oldestDueDate),
      }),
      badge: formatMoney(student.balanceCentimes, locale),
      tone: 'danger' as const,
    })),
    ...(otherOverdue > 0
      ? [
          {
            key: 'overdue-more',
            group: 'overdue' as const,
            href: '/dashboard/finance?status=overdue',
            title: t('overdueMore', { count: otherOverdue }),
            detail: t('overdueMoreDetail'),
            tone: 'warning' as const,
          },
        ]
      : []),
    ...(unreadMessages > 0
      ? [
          {
            key: 'messages',
            group: 'messages' as const,
            href: '/dashboard/messages',
            title: t('messages', { count: unreadMessages }),
            detail: t('messagesDetail'),
            tone: 'info' as const,
          },
        ]
      : []),
    ...(firstClass
      ? [
          {
            key: 'classes',
            group: 'classes' as const,
            href:
              classesWithoutTeacher.length === 1
                ? `/dashboard/classes/${firstClass.id}`
                : '/dashboard/classes',
            title: t('classes', { count: classesWithoutTeacher.length }),
            detail: classesWithoutTeacher.map((c, i) => (
              <Fragment key={c.id}>
                {i > 0 ? ' · ' : null}
                <bdi>{c.name}</bdi>
              </Fragment>
            )),
            tone: 'warning' as const,
          },
        ]
      : []),
    ...(expiredInvitations > 0
      ? [
          {
            key: 'invitations',
            group: 'invitations' as const,
            href: invitationsHref,
            title: t('invitations', { count: expiredInvitations }),
            detail: t('invitationsDetail'),
            tone: 'warning' as const,
          },
        ]
      : []),
  ];
  const ordered = queueOrder.flatMap((group) => rows.filter((row) => row.group === group));

  return (
    <Panel title={t('title')} kind="tasks" className="needs-today">
      {ordered.length === 0 && !incomplete ? <EmptyLine>{t('empty')}</EmptyLine> : null}
      {ordered.length > 0 ? (
        <ul className="briefing-list">
          {ordered.map((row) => (
            <li key={row.key}>
              <Link href={row.href} className="briefing-task">
                <span className={cx('needs-today-dot', dotTones[row.tone])} aria-hidden />
                <span className="briefing-task-copy">
                  <strong>{row.title}</strong>
                  <span>{row.detail}</span>
                </span>
                <span className="needs-today-end">
                  {row.badge ? (
                    <Badge tone={row.tone}>
                      <span className="font-mono tabular-nums">{row.badge}</span>
                    </Badge>
                  ) : null}
                  <ChevronRight className="rtl-flip size-4 text-text-muted" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {incomplete ? <p className="mt-3 text-sm text-text-muted">{t('unavailable')}</p> : null}
    </Panel>
  );
}
