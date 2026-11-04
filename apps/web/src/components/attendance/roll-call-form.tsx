'use client';

import {
  attendanceStatuses,
  type AttendanceStatus,
  type RollCallStudent,
  type StatusCounts,
} from '@tadriss/shared';
import { CheckCheck, Save } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, useTransition } from 'react';
import { submitAttendanceAction } from '@/app/actions/attendance';
import { useRouter } from '@/i18n/navigation';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { Input } from '../ui/field';
import { useToast } from '../ui/toast';
import { statusMeta } from './status';

type Mark = { status: AttendanceStatus; note: string };

const allPresent = (students: RollCallStudent[]): Record<string, Mark> =>
  Object.fromEntries(students.map((s) => [s.studentId, { status: 'present', note: '' }]));
export type ReadOnlyReason = 'future' | 'old' | 'other';

/**
 * The roll-call screen. New roll calls start with everyone present (the common case), so a teacher
 * only touches the exceptions. Rows are radio groups; absent/late/excused rows can carry a note.
 */
export function RollCallForm({
  slotId,
  date,
  students,
  readOnly,
}: {
  slotId: string;
  date: string;
  students: RollCallStudent[];
  readOnly: ReadOnlyReason | null;
}) {
  const t = useTranslations('attendance');
  const e = useTranslations('errors');
  const locale = useLocale();
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  const initial = useMemo(
    () =>
      Object.fromEntries(
        students.map((s) => [s.studentId, { status: s.status ?? 'present', note: s.note ?? '' }]),
      ) as Record<string, Mark>,
    [students],
  );
  const everTaken = students.some((s) => s.status !== null);
  const [marks, setMarks] = useState<Record<string, Mark>>(initial);
  const [saved, setSaved] = useState<Record<string, Mark>>(initial);
  const [taken, setTaken] = useState(everTaken);

  const dirty =
    !taken ||
    students.some((s) => {
      const a = marks[s.studentId];
      const b = saved[s.studentId];
      return a?.status !== b?.status || a?.note !== b?.note;
    });

  const totals = students.reduce<StatusCounts>(
    (c, s) => {
      const m = marks[s.studentId];
      if (m) c[m.status] += 1;
      return c;
    },
    { present: 0, late: 0, absent: 0, excused: 0 },
  );

  const set = (id: string, patch: Partial<Mark>) => {
    setMarks((cur) => ({ ...cur, [id]: { status: 'present', note: '', ...cur[id], ...patch } }));
  };

  const save = () => {
    start(async () => {
      const res = await submitAttendanceAction({
        slotId,
        date,
        records: students.map((s) => {
          const m = marks[s.studentId];
          return { studentId: s.studentId, status: m?.status ?? 'present', note: m?.note ?? '' };
        }),
      });
      if (!res.ok) {
        toast.error(e(res.error));
        return;
      }
      setSaved(marks);
      setTaken(true);
      toast.success(t('rollcall.saved'));
      router.refresh();
    });
  };

  const locked = readOnly !== null;

  return (
    <div className="grid gap-4">
      {locked ? (
        <p role="note" className="rounded-lg bg-warning-soft p-4 text-sm text-warning">
          {t(`rollcall.readOnly.${readOnly}`)}
        </p>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-5">
          <h2 className="font-semibold">{t('rollcall.students')}</h2>
          {!locked ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<CheckCheck className="size-4" aria-hidden />}
              onClick={() => {
                setMarks(allPresent(students));
              }}
            >
              {t('rollcall.markAll')}
            </Button>
          ) : null}
        </div>
        <ul className="divide-y divide-border">
          {students.map((s) => {
            const m = marks[s.studentId] ?? { status: 'present' as const, note: '' };
            const name = `${s.firstName} ${s.lastName}`;
            return (
              <li
                key={s.studentId}
                className="grid gap-3 px-4 py-4 transition-colors focus-within:bg-primary-soft/20 sm:px-5"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <Avatar first={s.firstName} last={s.lastName} seed={s.studentId} />
                  <p className="min-w-0 flex-1 basis-40 truncate font-medium">
                    <bdi>{name}</bdi>
                  </p>
                  <div
                    role="radiogroup"
                    aria-label={t('rollcall.group', { name })}
                    className="flex gap-1.5"
                  >
                    {attendanceStatuses.map((status) => {
                      const meta = statusMeta[status];
                      const Icon = meta.icon;
                      const on = m.status === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          tabIndex={on ? 0 : -1}
                          aria-label={t(`status.${status}`)}
                          title={t(`status.${status}`)}
                          disabled={locked}
                          onClick={() => {
                            set(s.studentId, { status });
                          }}
                          onKeyDown={(event) => {
                            if (
                              ![
                                'ArrowUp',
                                'ArrowDown',
                                'ArrowLeft',
                                'ArrowRight',
                                'Home',
                                'End',
                              ].includes(event.key)
                            )
                              return;
                            event.preventDefault();
                            const index = attendanceStatuses.indexOf(status);
                            const backwards =
                              event.key === 'ArrowUp' ||
                              (locale === 'ar'
                                ? event.key === 'ArrowRight'
                                : event.key === 'ArrowLeft');
                            const next =
                              event.key === 'Home'
                                ? 0
                                : event.key === 'End'
                                  ? attendanceStatuses.length - 1
                                  : (index + (backwards ? -1 : 1) + attendanceStatuses.length) %
                                    attendanceStatuses.length;
                            const selected = attendanceStatuses[next];
                            if (!selected) return;
                            set(s.studentId, { status: selected });
                            const buttons =
                              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                                '[role="radio"]',
                              );
                            buttons?.[next]?.focus();
                          }}
                          className={cx(
                            'inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold ring-1 ring-inset transition-colors disabled:cursor-not-allowed',
                            on
                              ? meta.selected
                              : 'bg-surface text-text-muted ring-border-strong/60 hover:bg-surface-muted',
                            locked && !on && 'opacity-40',
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                          <span className="hidden sm:inline">{t(`short.${status}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {m.status !== 'present' && (!locked || m.note) ? (
                  <Input
                    aria-label={t('rollcall.noteFor', { name })}
                    value={m.note}
                    dir="auto"
                    maxLength={300}
                    disabled={locked}
                    placeholder={t('rollcall.notePlaceholder')}
                    onChange={(ev) => {
                      set(s.studentId, { note: ev.target.value });
                    }}
                    className="h-10"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="workspace-savebar sticky bottom-20 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-strong/60 bg-surface p-4 shadow-md lg:bottom-4">
        <p className="text-sm text-text-muted">
          <span className="font-mono tabular-nums">{t('rollcall.totals', totals)}</span>
          {dirty && !locked ? (
            <span className="ms-3 text-warning">{t('rollcall.unsaved')}</span>
          ) : null}
        </p>
        {!locked ? (
          <Button
            pending={pending}
            disabled={!dirty}
            icon={<Save className="size-4" aria-hidden />}
            onClick={save}
          >
            {t('rollcall.save')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
