'use client';

import { Archive, ArchiveRestore } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { archiveClassAction } from '@/app/actions/classes';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';

/** Archive (with confirmation) or restore a class. Archiving never deletes anything. */
export function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const t = useTranslations('classes');
  const c = useTranslations('common');
  const e = useTranslations('errors');
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const run = (next: boolean) => {
    start(async () => {
      const res = await archiveClassAction(id, next);
      setConfirming(false);
      if (res.ok) toast.success(t(next ? 'feedback.archived' : 'feedback.restored'));
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
        {t('archive.restore')}
      </Button>
    );
  }
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon={<Archive className="size-4" aria-hidden />}
        onClick={() => {
          setConfirming(true);
        }}
      >
        {t('archive.button')}
      </Button>
      <Dialog
        open={confirming}
        onClose={() => {
          setConfirming(false);
        }}
        title={t('archive.title')}
        description={t('archive.body')}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              setConfirming(false);
            }}
          >
            {c('cancel')}
          </Button>
          <Button
            variant="accent"
            pending={pending}
            onClick={() => {
              run(true);
            }}
          >
            {t('archive.confirm')}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
