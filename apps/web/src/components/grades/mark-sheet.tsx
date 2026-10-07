'use client';

import { normalise20, parseScore, type MarkSheetRow } from '@tadriss/shared';
import { Save } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useRef, useState, useTransition } from 'react';
import { saveGradesAction } from '@/app/actions/grades';
import { useRouter } from '@/i18n/navigation';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { Input } from '../ui/field';
import { useToast } from '../ui/toast';

type Cell = { text: string; absent: boolean; remark: string };

/**
 * The grade-entry sheet. Blank = no mark yet; the checkbox = absent. Typing updates the class
 * statistics live; a mark outside 0…max is flagged before it can be saved. Enter moves down a row.
 */
export function MarkSheet({
  examId,
  maxScore,
  rows,
  canEdit,
}: {
  examId: string;
  maxScore: number;
  rows: MarkSheetRow[];
  canEdit: boolean;
}) {
  const t = useTranslations('grades');
  const e = useTranslations('errors');
  const locale = useLocale();
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Show numbers the way the person types them: a comma in French and Arabic.
  const show = (n: number) => String(n).replace('.', locale === 'en' ? '.' : ',');
  const initial = useMemo(
    () =>
      Object.fromEntries(
        rows.map((r) => [
          r.studentId,
          { text: r.score === null ? '' : show(r.score), absent: r.absent, remark: r.remark ?? '' },
        ]),
      ) as Record<string, Cell>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, locale],
  );
  const [cells, setCells] = useState(initial);
  const [saved, setSaved] = useState(initial);

  const set = (id: string, patch: Partial<Cell>) => {
    setCells((cur) => ({
      ...cur,
      [id]: { text: '', absent: false, remark: '', ...cur[id], ...patch },
    }));
  };

  const parsed = rows.map((r) => {
    const c = cells[r.studentId] ?? { text: '', absent: false, remark: '' };
    const p = parseScore(c.text);
    const invalid = !c.absent && (!p.ok || (p.value !== null && p.value > maxScore));
    return { r, c, value: p.ok ? p.value : null, invalid };
  });
  const anyInvalid = parsed.some((p) => p.invalid);
  const dirty = rows.some((r) => {
    const a = cells[r.studentId];
    const b = saved[r.studentId];
    return a?.text !== b?.text || a?.absent !== b?.absent || a?.remark !== b?.remark;
  });

  // An invalid entry (e.g. 23 out of 20) is not a mark yet: it must not skew the live statistics.
  const counted = parsed.filter((p) => !p.c.absent && p.value !== null && !p.invalid);
  const marks = counted.map((p) => normalise20(p.value ?? 0, maxScore));
  const stats = {
    graded: counted.length,
    absent: parsed.filter((p) => p.c.absent).length,
    avg: marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : null,
    min: marks.length ? Math.min(...marks) : null,
    max: marks.length ? Math.max(...marks) : null,
  };
  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  const save = () => {
    start(async () => {
      const res = await saveGradesAction({
        examId,
        grades: parsed.map((p) => ({
          studentId: p.r.studentId,
          score: p.c.absent ? null : p.value,
          absent: p.c.absent,
          remark: p.c.remark,
        })),
      });
      if (!res.ok) {
        toast.error(e(res.error));
        return;
      }
      setSaved(cells);
      toast.success(t('sheet.saved'));
      router.refresh();
    });
  };

  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ['average', stats.avg === null ? '—' : fmt.format(stats.avg)],
            ['min', stats.min === null ? '—' : fmt.format(stats.min)],
            ['max', stats.max === null ? '—' : fmt.format(stats.max)],
            ['graded', `${fmt.format(stats.graded)}/${fmt.format(rows.length)}`],
          ] as const
        ).map(([key, value]) => (
          <Card key={key} className="p-4">
            <dt className="text-xs text-text-muted">{t(`detail.stats.${key}`)}</dt>
            <dd className="mt-1 font-mono text-2xl font-medium tabular-nums">{value}</dd>
          </Card>
        ))}
      </dl>

      {!canEdit ? (
        <p role="note" className="rounded-lg bg-info-soft p-4 text-sm text-info">
          {t('sheet.readOnly')}
        </p>
      ) : (
        <p className="text-xs text-text-muted">{t('sheet.hint')}</p>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-border p-4 sm:px-5">
          <h2 className="font-semibold">{t('sheet.title')}</h2>
        </div>
        <ul className="divide-y divide-border">
          {parsed.map(({ r, c, invalid }, i) => {
            const name = `${r.firstName} ${r.lastName}`;
            const errId = `score-error-${r.studentId}`;
            return (
              <li key={r.studentId} className="grid gap-2 px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Avatar
                    first={r.firstName}
                    last={r.lastName}
                    seed={r.studentId}
                    className="size-9 text-xs"
                  />
                  <p className="min-w-0 flex-1 basis-40 truncate font-medium">
                    <bdi>{name}</bdi>
                  </p>
                  <div className="w-24">
                    <Input
                      ref={(el: HTMLInputElement | null) => {
                        inputs.current[i] = el;
                      }}
                      value={c.absent ? '' : c.text}
                      inputMode="decimal"
                      dir="ltr"
                      autoComplete="off"
                      disabled={!canEdit || c.absent}
                      aria-label={t('sheet.scoreFor', { name })}
                      aria-invalid={invalid ? true : undefined}
                      aria-describedby={invalid ? errId : undefined}
                      onChange={(ev) => {
                        set(r.studentId, { text: ev.target.value });
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter') {
                          ev.preventDefault();
                          inputs.current[i + 1]?.focus();
                        }
                      }}
                      className={cx(
                        'h-10 text-end font-mono tabular-nums',
                        c.absent && 'opacity-50',
                      )}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={c.absent}
                      disabled={!canEdit}
                      aria-label={t('sheet.absentFor', { name })}
                      onChange={(ev) => {
                        set(r.studentId, { absent: ev.target.checked });
                      }}
                      className="size-4 accent-primary"
                    />
                    {t('sheet.absent')}
                  </label>
                </div>
                {invalid ? (
                  <p id={errId} role="alert" className="text-sm text-danger">
                    {t('sheet.invalid', { max: maxScore })}
                  </p>
                ) : null}
                {canEdit || c.remark ? (
                  <Input
                    value={c.remark}
                    maxLength={300}
                    disabled={!canEdit}
                    placeholder={t('sheet.remarkPlaceholder')}
                    aria-label={t('sheet.remarkFor', { name })}
                    onChange={(ev) => {
                      set(r.studentId, { remark: ev.target.value });
                    }}
                    className="h-9 text-sm"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      {canEdit ? (
        <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur md:bottom-4">
          <p className="font-mono text-sm tabular-nums text-text-muted">
            {t('sheet.totals', { graded: stats.graded, absent: stats.absent })}
            {dirty ? <span className="ms-3 text-warning">{t('sheet.unsaved')}</span> : null}
          </p>
          <Button
            pending={pending}
            disabled={!dirty || anyInvalid}
            icon={<Save className="size-4" aria-hidden />}
            onClick={save}
          >
            {t('sheet.save')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
