'use client';

import { ArchiveRestore, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { archiveHomeworkAction } from '@/app/actions/homework';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';

/** Delete (with confirmation) or restore a homework. Deleting is soft: nothing is lost. */
export function ArchiveHomeworkButton({ id, archived }: { id: string; archived: boolean }) {
  const t = useTranslations('homework');
  const c = useTranslations('common');
  const e = useTranslations('errors');
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const close = () => {
    setConfirming(false);
  };

  const run = (next: boolean) => {
    start(async () => {
      const res = await archiveHomeworkAction(id, next);
      close();
      if (res.ok) toast.success(t(next ? 'feedback.deleted' : 'feedback.restored'));
      else toast.error(e(res.error));
    });
  };

  if (archived) {
    return (
      <Button
        variant="secondary"
        size="sm"
        pending={pending}
        icon={<ArchiveRestore className="size-4" aria-hidden />}
        onClick={() => {
          run(false);
        }}
      >
        {t('actions.restore')}
      </Button>
    );
  }
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon={<Trash2 className="size-4" aria-hidden />}
        onClick={() => {
          setConfirming(true);
        }}
      >
        {t('actions.delete')}
      </Button>
      <Dialog
        open={confirming}
        onClose={close}
        title={t('delete.title')}
        description={t('delete.body')}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close}>
            {c('cancel')}
          </Button>
          <Button
            variant="accent"
            pending={pending}
            onClick={() => {
              run(true);
            }}
          >
            {t('delete.confirm')}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
