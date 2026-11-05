import {
  attendanceRate,
  countStatuses,
  formatMoney,
  getStudentFile,
  invoiceStatus,
  listMyAttendance,
  listMyGrades,
  listMyInvoices,
  overallAverage,
  timeRange,
  todayIn,
  type AttendanceStatus,
} from '@tadriss/shared';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  FileText,
  GraduationCap,
  MessageSquare,
  ReceiptText,
  Wallet,
} from 'lucide-react';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { StatusBadge } from '../finance/status-badge';
import { StatTile } from '../home/dash-parts';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';

/** How many rows of each history the file shows. */
const RECENT = 5;
/** Enough sessions for a whole school year, so the rate is not computed on the latest few weeks. */
const ATTENDANCE_LIMIT = 1000;

const attendanceTones: Record<AttendanceStatus, 'danger' | 'warning' | 'info' | 'success'> = {
  absent: 'danger',
  late: 'warning',
  excused: 'info',
  present: 'success',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <h2 className="border-b border-border p-5 font-semibold sm:px-6">{title}</h2>
      {children}
    </Card>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="p-5 text-sm text-text-muted sm:px-6">{children}</p>;
}

/** Everything the administration needs when a family calls about one student, on one page. */
export async function StudentFilePage({ id }: { id: string }) {
  const supabase = await getServerClient();
  const [t, status, errors, f, locale, viewer, file] = await Promise.all([
    getTranslations('studentFile'),
    getTranslations('attendance.status'),
    getTranslations('errors'),
    getFormatter(),
    getLocale(),
    getViewer(),
    getStudentFile(supabase, id),
  ]);
  if (!file.ok && file.error === 'not_found') notFound();
  if (!file.ok) {
    return (
      <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-6xl gap-7">
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h1 className="display text-2xl">{t('error.title')}</h1>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href={`/dashboard/students/${id}`} variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const student = file.data;
  const [attendance, grades, invoices] = await Promise.all([
    listMyAttendance(supabase, { studentId: id, limit: ATTENDANCE_LIMIT }),
    listMyGrades(supabase, { studentId: id }),
    listMyInvoices(supabase, { studentId: id }),
  ]);
  const today = todayIn(viewer?.profile.institution?.timezone ?? 'Africa/Casablanca');
  const date = (iso: string) =>
    f.dateTime(new Date(`${iso}T12:00:00Z`), { dateStyle: 'medium', timeZone: 'UTC' });
  const score = (n: number) => f.number(n, { maximumFractionDigits: 2 });

  const counts = attendance.ok ? countStatuses(attendance.data) : null;
  const rate = counts ? attendanceRate(counts) : null;
  const average = grades.ok ? overallAverage(grades.data) : null;
  const openInvoices = invoices.ok ? invoices.data.filter((i) => !i.voided) : [];
  const owed = openInvoices.reduce((sum, i) => sum + i.balanceCentimes, 0);
  const overdue = openInvoices
    .filter((i) => i.dueDate < today)
    .reduce((sum, i) => sum + i.balanceCentimes, 0);
  const issues = attendance.ok ? attendance.data.filter((a) => a.status !== 'present') : [];

  return (
    <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-6xl gap-7">
      <Link
        href="/dashboard/students"
        className="inline-flex w-fit items-center gap-2 text-sm text-text-muted hover:text-primary"
      >
        <ArrowLeft className="rtl-flip size-4" aria-hidden />
        {t('back')}
      </Link>

      <header className="workspace-header flex flex-wrap items-end justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar
            first={student.firstName}
            last={student.lastName}
            seed={student.id}
            className="size-14 shrink-0 text-lg"
          />
          <div className="min-w-0">
            <Badge tone={student.invited ? 'info' : student.isActive ? 'success' : 'neutral'} dot>
              {student.invited ? t('invited') : student.isActive ? t('active') : t('inactive')}
            </Badge>
            <h1 className="display mt-3 text-4xl md:text-5xl">
              <bdi>
                {student.firstName} {student.lastName}
              </bdi>
            </h1>
            {student.email ? (
              <p className="mt-2 truncate text-sm text-text-muted">
                <bdi>{student.email}</bdi>
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {student.isActive && !student.invited ? (
            <ButtonLink
              href={`/dashboard/messages/${student.id}`}
              variant="secondary"
              icon={<MessageSquare className="size-4" aria-hidden />}
            >
              {t('actions.message')}
            </ButtonLink>
          ) : null}
          <ButtonLink
            href={`/report/${student.id}`}
            variant="secondary"
            icon={<FileText className="size-4" aria-hidden />}
          >
            {t('actions.report')}
          </ButtonLink>
          <ButtonLink
            href={`/dashboard/finance?q=${encodeURIComponent(student.lastName)}`}
            icon={<ReceiptText className="size-4" aria-hidden />}
          >
            {t('actions.invoices')}
          </ButtonLink>
        </div>
      </header>

      <dl className="metric-strip dashboard-metrics dashboard-metrics-pairs grid grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={CalendarCheck}
          label={t('stats.attendance')}
          value={rate === null ? '–' : f.number(rate / 100, { style: 'percent' })}
          hint={counts ? t('stats.absences', { count: counts.absent }) : t('unavailable')}
          tone={!counts ? 'primary' : counts.absent > 0 ? 'warning' : 'success'}
        />
        <StatTile
          icon={GraduationCap}
          label={t('stats.average')}
          value={average === null ? '–' : `${score(average)}/20`}
          hint={grades.ok ? t('stats.averageHint') : t('unavailable')}
          tone="accent"
        />
        <StatTile
          icon={Wallet}
          label={t('stats.balance')}
          value={invoices.ok ? formatMoney(owed, locale) : '–'}
          hint={
            !invoices.ok
              ? t('unavailable')
              : overdue > 0
                ? t('stats.overdue', { amount: formatMoney(overdue, locale) })
                : undefined
          }
          tone={!invoices.ok ? 'primary' : overdue > 0 ? 'danger' : 'success'}
        />
        <StatTile
          icon={BookOpen}
          label={t('stats.classes')}
          value={student.classes.length}
          tone="info"
        />
      </dl>

      <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <div className="grid min-w-0 grid-cols-1 gap-6">
          <Section title={t('grades.title')}>
            {!grades.ok ? (
              <Note>{t('unavailable')}</Note>
            ) : grades.data.length === 0 ? (
              <Note>{t('grades.empty')}</Note>
            ) : (
              <ul className="divide-y divide-border">
                {grades.data.slice(0, RECENT).map((mark) => (
                  <li
                    key={mark.examId}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        <bdi>{mark.subjectName}</bdi>
                      </p>
                      <p className="truncate text-sm text-text-muted">
                        <bdi>{mark.title}</bdi> ·{' '}
                        <span className="font-mono tabular-nums">{date(mark.examDate)}</span>
                      </p>
                    </div>
                    <span className="shrink-0 font-mono tabular-nums">
                      {mark.absent || mark.score === null
                        ? t('grades.absent')
                        : `${score(mark.score)}/${score(mark.maxScore)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t('absences.title')}>
            {!attendance.ok ? (
              <Note>{t('unavailable')}</Note>
            ) : issues.length === 0 ? (
              <Note>{t('absences.empty')}</Note>
            ) : (
              <ul className="divide-y divide-border">
                {issues.slice(0, RECENT).map((entry) => (
                  <li
                    key={entry.sessionId}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        <bdi>{entry.subjectName}</bdi>
                      </p>
                      <p className="truncate font-mono text-sm tabular-nums text-text-muted">
                        {date(entry.date)} · {timeRange(entry)}
                      </p>
                    </div>
                    <Badge tone={attendanceTones[entry.status]}>{status(entry.status)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t('invoices.title')}>
            {!invoices.ok ? (
              <Note>{t('unavailable')}</Note>
            ) : invoices.data.length === 0 ? (
              <Note>{t('invoices.empty')}</Note>
            ) : (
              <ul className="divide-y divide-border">
                {invoices.data.slice(0, RECENT).map((invoice) => (
                  <li key={invoice.id}>
                    <Link
                      href={`/dashboard/finance/${invoice.id}`}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5 hover:bg-surface-muted sm:px-6"
                    >
                      <span className="min-w-0 flex-1 basis-48">
                        <span className="block truncate font-medium">
                          <bdi>{invoice.description}</bdi>
                        </span>
                        <span className="block font-mono text-sm tabular-nums text-text-muted">
                          {invoice.number} · {t('invoices.due', { date: date(invoice.dueDate) })}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums">
                        {invoice.voided ? '–' : formatMoney(invoice.balanceCentimes, locale)}
                      </span>
                      <StatusBadge status={invoiceStatus(invoice, today)} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6">
          <Section title={t('classes.title')}>
            {student.classes.length === 0 ? (
              <Note>{t('classes.empty')}</Note>
            ) : (
              <ul className="divide-y divide-border">
                {student.classes.map((cls) => (
                  <li key={cls.id}>
                    <Link
                      href={`/dashboard/classes/${cls.id}`}
                      className="block px-5 py-3.5 hover:bg-surface-muted sm:px-6"
                    >
                      <span className="block truncate font-medium">
                        <bdi>{cls.name}</bdi>
                      </span>
                      <span className="block text-sm text-text-muted">
                        {t.rich('classes.since', {
                          date: date(cls.enrolledOn),
                          mono: (chunks) => (
                            <span className="font-mono tabular-nums">{chunks}</span>
                          ),
                        })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t('parents.title')}>
            {student.parents.length === 0 ? (
              <div className="grid justify-items-start gap-3 p-5 sm:px-6">
                <p className="text-sm text-text-muted">{t('parents.empty')}</p>
                <ButtonLink href="/dashboard/parents" variant="secondary" size="sm">
                  {t('parents.link')}
                </ButtonLink>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {student.parents.map((parent) => (
                  <li key={parent.id}>
                    <Link
                      href={`/dashboard/messages/${parent.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-surface-muted sm:px-6"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          <bdi>{parent.name}</bdi>
                        </span>
                        {parent.email ? (
                          <span className="block truncate text-sm text-text-muted">
                            <bdi>{parent.email}</bdi>
                          </span>
                        ) : null}
                      </span>
                      <MessageSquare
                        className="size-4 shrink-0 text-text-muted"
                        aria-label={t('actions.message')}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
