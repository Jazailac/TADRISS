'use client';

import { UserMinus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { withdrawStudentAction } from '@/app/actions/classes';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';

export function WithdrawButton({ enrolmentId, name }: { enrolmentId: string; name: string }) {
  const t = useTranslations('classes');
  const c = useTranslations('common');
  const e = useTranslations('errors');
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const close = () => {
    setOpen(false);
  };

  const run = () => {
    start(async () => {
      const res = await withdrawStudentAction(enrolmentId);
      close();
      if (res.ok) toast.success(t('feedback.withdrawn'));
      else toast.error(e(res.error));
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        aria-label={t('withdraw.label', { name })}
        title={t('withdraw.confirm')}
        className="grid size-10 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
      >
        <UserMinus className="size-4" aria-hidden />
      </button>
      <Dialog
        open={open}
        onClose={close}
        title={t('withdraw.title', { name })}
        description={t('withdraw.body')}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close}>
            {c('cancel')}
          </Button>
          <Button variant="accent" pending={pending} onClick={run}>
            {t('withdraw.confirm')}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
