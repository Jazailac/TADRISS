'use client';

import type { EnrolableStudent } from '@tadriss/shared';
import { Search, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import { enrolStudentsAction, searchEnrolableAction } from '@/app/actions/classes';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Input } from '../ui/field';
import { Spinner } from '../ui/spinner';
import { useToast } from '../ui/toast';

type Loaded =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; rows: EnrolableStudent[] };

/**
 * Searchable multi-select of students who have no class this year. Selection is capped at the
 * seats left (when the class has a capacity); the server re-checks atomically.
 */
export function EnrolDialog({
  classId,
  schoolYear,
  seatsLeft,
}: {
  classId: string;
  schoolYear: string;
  seatsLeft: number | null;
}) {
  const t = useTranslations('classes');
  const c = useTranslations('common');
  const e = useTranslations('errors');
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const close = () => {
    setOpen(false);
  };

  // Debounced search while the dialog is open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(
      () => {
        void searchEnrolableAction(schoolYear, q).then((res) => {
          if (cancelled) return;
          setLoaded(res.ok ? { status: 'ready', rows: res.data } : { status: 'error' });
        });
      },
      q === '' ? 0 : 250,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, q, schoolYear]);

  const limit = seatsLeft ?? Number.POSITIVE_INFINITY;

  const toggle = (id: string) => {
    setChosen((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else if (next.size < limit) next.add(id);
      return next;
    });
  };

  const submit = () => {
    start(async () => {
      const res = await enrolStudentsAction(classId, [...chosen]);
      if (!res.ok) {
        toast.error(e(res.error));
        return;
      }
      close();
      toast.success(
        res.data.skipped > 0
          ? t('feedback.enrolledSkipped', res.data)
          : t('feedback.enrolled', { enrolled: res.data.enrolled }),
      );
    });
  };

  return (
    <>
      <Button
        size="sm"
        icon={<UserPlus className="size-4" aria-hidden />}
        disabled={seatsLeft === 0}
        onClick={() => {
          setQ('');
          setChosen(new Set());
          setLoaded({ status: 'loading' });
          setOpen(true);
        }}
      >
        {t('enrol.button')}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={t('enrol.title')}
        description={t('enrol.description')}
      >
        <div className="flex items-center justify-between gap-3 text-xs text-text-muted">
          <span className="font-mono">
            {seatsLeft === null ? t('enrol.unlimited') : t('enrol.seatsLeft', { count: seatsLeft })}
          </span>
        </div>
        <div className="mt-3">
          <label htmlFor="enrol-q" className="sr-only">
            {t('enrol.search')}
          </label>
          <Input
            id="enrol-q"
            type="search"
            value={q}
            onChange={(ev) => {
              setQ(ev.target.value);
            }}
            placeholder={t('enrol.search')}
            autoComplete="off"
            icon={<Search className="size-4" aria-hidden />}
            className="h-10"
          />
        </div>
        <div className="mt-3 min-h-40">
          {loaded.status === 'loading' ? (
            <div className="grid h-40 place-items-center text-text-muted">
              <Spinner />
            </div>
          ) : loaded.status === 'error' ? (
            <p role="alert" className="rounded-lg bg-danger-soft p-4 text-sm text-danger">
              {t('enrol.loadError')}
            </p>
          ) : loaded.rows.length === 0 ? (
            <p className="rounded-lg bg-surface-muted p-4 text-sm text-text-muted">
              {q === '' ? t('enrol.none') : t('enrol.noMatch')}
            </p>
          ) : (
            <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {loaded.rows.map((s) => {
                const checked = chosen.has(s.id);
                return (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface-muted has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && chosen.size >= limit}
                        onChange={() => {
                          toggle(s.id);
                        }}
                        className="size-4 accent-primary"
                      />
                      <Avatar
                        first={s.firstName}
                        last={s.lastName}
                        seed={s.id}
                        className="size-8 text-xs"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          <bdi>
                            {s.firstName} {s.lastName}
                          </bdi>
                        </span>
                        {s.email ? (
                          <span className="block truncate text-xs text-text-muted">
                            <bdi>{s.email}</bdi>
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close}>
            {c('cancel')}
          </Button>
          <Button pending={pending} disabled={chosen.size === 0} onClick={submit}>
            {t('enrol.submit', { count: chosen.size })}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
