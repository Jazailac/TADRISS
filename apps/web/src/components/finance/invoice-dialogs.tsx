'use client';

import { formatMoney, type FeePlan } from '@tadriss/shared';
import { Plus, Search, Sparkles, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  createInvoiceAction,
  generateInvoicesAction,
  searchStudentsAction,
  type StudentMatch,
} from '@/app/actions/finance';
import { useRouter } from '@/i18n/navigation';
import { ActionForm } from '../forms/action-form';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Input } from '../ui/field';
import { Spinner } from '../ui/spinner';
import { useToast } from '../ui/toast';

/** A one-off invoice for one student: find the student first, then fill in the details. */
export function NewInvoiceButton({ defaultDueDate }: { defaultDueDate: string }) {
  const t = useTranslations('finance.invoice');
  const f = useTranslations('finance');
  const c = useTranslations('common');
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState<StudentMatch[] | 'loading' | 'error'>('loading');
  const [student, setStudent] = useState<StudentMatch | null>(null);
  const close = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (!open || student) return;
    let cancelled = false;
    const timer = setTimeout(
      () => {
        void searchStudentsAction(q).then((res) => {
          if (!cancelled) setMatches(res.ok ? res.data : 'error');
        });
      },
      q === '' ? 0 : 250,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, q, student]);

  return (
    <>
      <Button
        icon={<Plus className="size-4" aria-hidden />}
        onClick={() => {
          setQ('');
          setStudent(null);
          setMatches('loading');
          setOpen(true);
        }}
      >
        {f('actions.newInvoice')}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={t('title')}
        description={t('description')}
        className="max-w-xl"
      >
        {student ? (
          <div className="grid gap-4">
            <p className="flex items-center gap-3 rounded-lg bg-primary-soft px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">
                <bdi>{t('selected', { name: student.name })}</bdi>
              </span>
              <button
                type="button"
                aria-label={c('cancel')}
                onClick={() => {
                  setStudent(null);
                }}
                className="grid size-7 place-items-center rounded-md hover:bg-surface"
              >
                <X className="size-4" aria-hidden />
              </button>
            </p>
            <ActionForm
              schema="createInvoice"
              action={createInvoiceAction}
              hidden={{ studentId: student.id }}
              defaults={{ dueDate: defaultDueDate }}
              fields={[
                {
                  name: 'description',
                  label: t('fields.description'),
                  kind: 'text',
                  placeholder: t('placeholders.description'),
                },
                {
                  name: 'amount',
                  label: t('fields.amount'),
                  kind: 'decimal',
                  placeholder: t('placeholders.amount'),
                  half: true,
                },
                { name: 'dueDate', label: t('fields.dueDate'), kind: 'date', half: true },
              ]}
              submitLabel={t('submit')}
              cancelLabel={c('cancel')}
              onCancel={close}
              onDone={(values) => {
                close();
                toast.success(f('feedback.invoiceCreated'));
                if (values.id) router.push(`/dashboard/finance/${values.id}`);
              }}
            />
          </div>
        ) : (
          <div className="grid gap-3">
            <label htmlFor="invoice-student-q" className="sr-only">
              {t('fields.student')}
            </label>
            <Input
              id="invoice-student-q"
              type="search"
              value={q}
              onChange={(ev) => {
                setQ(ev.target.value);
              }}
              placeholder={t('placeholders.student')}
              autoComplete="off"
              icon={<Search className="size-4" aria-hidden />}
              className="h-10"
            />
            <div className="min-h-32">
              {matches === 'loading' ? (
                <div className="grid h-32 place-items-center text-text-muted">
                  <Spinner />
                </div>
              ) : matches === 'error' || matches.length === 0 ? (
                <p className="rounded-lg bg-surface-muted p-4 text-sm text-text-muted">
                  {matches === 'error' ? f('error.body') : t('noMatch')}
                </p>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                  {matches.map((m) => {
                    const [first = '', ...rest] = m.name.split(' ');
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setStudent(m);
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-start hover:bg-surface-muted"
                        >
                          <Avatar
                            first={first}
                            last={rest.join(' ')}
                            seed={m.id}
                            className="size-8 text-xs"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              <bdi>{m.name}</bdi>
                            </span>
                            {m.email ? (
                              <span className="block truncate text-xs text-text-muted">
                                <bdi>{m.email}</bdi>
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="text-xs text-text-muted">{t('pickStudent')}</p>
          </div>
        )}
      </Dialog>
    </>
  );
}

/** One invoice per enrolled student of a class, from a fee plan. Safe to run twice. */
export function GenerateInvoicesButton({
  plans,
  classes,
  defaultDueDate,
}: {
  plans: FeePlan[];
  classes: { id: string; name: string }[];
  defaultDueDate: string;
}) {
  const t = useTranslations('finance.generate');
  const f = useTranslations('finance');
  const c = useTranslations('common');
  const locale = useLocale();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState<string>(plans.find((p) => !p.archived)?.id ?? '');
  const close = () => {
    setOpen(false);
  };
  const active = plans.filter((p) => !p.archived);
  const chosen = active.find((p) => p.id === planId) ?? active[0];
  const blocked = active.length === 0 || classes.length === 0;

  return (
    <>
      <Button
        variant="secondary"
        icon={<Sparkles className="size-4" aria-hidden />}
        onClick={() => {
          setPlanId(active[0]?.id ?? '');
          setOpen(true);
        }}
      >
        {f('actions.generate')}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={t('title')}
        description={t('description')}
        className="max-w-xl"
      >
        {blocked ? (
          <p className="rounded-lg bg-warning-soft p-4 text-sm text-warning">
            {active.length === 0 ? t('noPlans') : t('noClasses')}
          </p>
        ) : (
          <div className="grid gap-3">
            <ActionForm
              schema="generateInvoices"
              action={generateInvoicesAction}
              defaults={{ dueDate: defaultDueDate, feePlanId: chosen?.id ?? '' }}
              onFieldChange={(name, value) => {
                if (name === 'feePlanId') setPlanId(value);
              }}
              fields={[
                {
                  name: 'feePlanId',
                  label: t('fields.plan'),
                  kind: 'select',
                  options: active.map((p) => ({
                    value: p.id,
                    label: `${p.name} (${formatMoney(p.amountCentimes, locale)})`,
                  })),
                },
                {
                  name: 'classId',
                  label: t('fields.class'),
                  kind: 'select',
                  options: classes.map((x) => ({ value: x.id, label: x.name })),
                  half: true,
                },
                { name: 'dueDate', label: t('fields.dueDate'), kind: 'date', half: true },
                {
                  name: 'description',
                  label: t('fields.description'),
                  kind: 'text',
                  placeholder: t('placeholders.description'),
                },
              ]}
              submitLabel={t('submit')}
              cancelLabel={c('cancel')}
              onCancel={close}
              onDone={(values) => {
                close();
                const issued = Number(values.issued ?? 0);
                if (issued > 0) toast.success(f('feedback.generated', { count: issued }));
                else toast.success(f('feedback.nothingToGenerate'));
              }}
            />
            {chosen ? (
              <p className="text-xs text-text-muted">
                {t('preview', { amount: formatMoney(chosen.amountCentimes, locale) })}
              </p>
            ) : null}
          </div>
        )}
      </Dialog>
    </>
  );
}
