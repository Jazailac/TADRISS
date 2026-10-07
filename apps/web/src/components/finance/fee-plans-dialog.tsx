'use client';

import { formatMoney, type FeePlan } from '@tadriss/shared';
import { Archive, ArchiveRestore, Banknote } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import {
  archiveFeePlanAction,
  createFeePlanAction,
  updateFeePlanAction,
} from '@/app/actions/finance';
import { ActionForm } from '../forms/action-form';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cx } from '../ui/cx';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';

/** Manage the school's fee plans. The amount is fixed once created (invoices copy it). */
export function FeePlansButton({ plans }: { plans: FeePlan[] }) {
  const t = useTranslations('finance.plans');
  const f = useTranslations('finance');
  const c = useTranslations('common');
  const e = useTranslations('errors');
  const locale = useLocale();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeePlan | null>(null);
  const [round, setRound] = useState(0);
  const [pending, start] = useTransition();

  const toggle = (p: FeePlan) => {
    start(async () => {
      const res = await archiveFeePlanAction(p.id, !p.archived);
      if (res.ok) toast.success(f(p.archived ? 'feedback.planRestored' : 'feedback.planArchived'));
      else toast.error(e(res.error));
    });
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={<Banknote className="size-4" aria-hidden />}
        onClick={() => {
          setOpen(true);
        }}
      >
        {f('actions.plans')}
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={t('title')}
        description={t('description')}
        className="max-w-xl"
      >
        {plans.length === 0 ? (
          <p className="rounded-lg bg-surface-muted p-4 text-sm text-text-muted">{t('empty')}</p>
        ) : (
          <ul
            aria-label={t('list')}
            className="max-h-60 divide-y divide-border overflow-y-auto rounded-lg border border-border"
          >
            {plans.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <span
                  className={cx(
                    'min-w-0 flex-1 truncate text-sm font-medium',
                    p.archived && 'text-text-muted line-through',
                  )}
                >
                  <bdi>{p.name}</bdi>
                </span>
                {p.archived ? <Badge>{t('archived')}</Badge> : null}
                <span className="font-mono text-sm tabular-nums">
                  {formatMoney(p.amountCentimes, locale)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t('editLabel', { name: p.name })}
                  onClick={() => {
                    setEditing(p);
                  }}
                >
                  {t('edit')}
                </Button>
                <button
                  type="button"
                  disabled={pending}
                  title={p.archived ? t('restore') : t('archive')}
                  aria-label={
                    p.archived
                      ? t('restoreLabel', { name: p.name })
                      : t('archiveLabel', { name: p.name })
                  }
                  onClick={() => {
                    toggle(p);
                  }}
                  className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text disabled:opacity-60"
                >
                  {p.archived ? (
                    <ArchiveRestore className="size-4" aria-hidden />
                  ) : (
                    <Archive className="size-4" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 border-t border-border pt-5">
          {editing ? (
            <ActionForm
              key={`edit-${editing.id}`}
              schema="updateFeePlan"
              action={updateFeePlanAction}
              hidden={{ id: editing.id }}
              defaults={{ name: editing.name, description: editing.description ?? '' }}
              fields={[
                { name: 'name', label: t('fields.name'), kind: 'text' },
                { name: 'description', label: t('fields.description'), kind: 'text' },
              ]}
              submitLabel={t('save')}
              cancelLabel={c('cancel')}
              onCancel={() => {
                setEditing(null);
              }}
              onDone={() => {
                setEditing(null);
                toast.success(f('feedback.planUpdated'));
              }}
            />
          ) : (
            <ActionForm
              key={`add-${round}`}
              schema="createFeePlan"
              action={createFeePlanAction}
              fields={[
                {
                  name: 'name',
                  label: t('fields.name'),
                  kind: 'text',
                  placeholder: t('placeholders.name'),
                  half: true,
                },
                {
                  name: 'amount',
                  label: t('fields.amount'),
                  kind: 'decimal',
                  placeholder: t('placeholders.amount'),
                  half: true,
                },
                { name: 'description', label: t('fields.description'), kind: 'text' },
              ]}
              submitLabel={t('add')}
              cancelLabel={c('close')}
              onCancel={() => {
                setOpen(false);
              }}
              onDone={() => {
                setRound((r) => r + 1);
                toast.success(f('feedback.planCreated'));
              }}
            />
          )}
        </div>
      </Dialog>
    </>
  );
}
