'use client';

import { ArchiveRestore, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { archiveExamAction, publishExamAction } from '@/app/actions/grades';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';

/**
 * Publish / unpublish an exam's marks. Publishing with students still unmarked asks first, since a
 * student only ever sees their own mark and a missing one is easy to overlook.
 */
export function PublishButton({
  id,
  published,
  missing,
}: {
  id: string;
  published: boolean;
  missing: number;
}) {
  const t = useTranslations('grades');
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
      const res = await publishExamAction(id, next);
      close();
      if (res.ok) toast.success(t(next ? 'feedback.published' : 'feedback.unpublished'));
      else toast.error(e(res.error));
    });
  };

  return (
    <>
      <Button
        size="sm"
        variant={published ? 'secondary' : 'primary'}
        pending={pending && !confirming}
        icon={
          published ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )
        }
        onClick={() => {
          if (!published && missing > 0) setConfirming(true);
          else run(!published);
        }}
      >
        {published ? t('actions.unpublish') : t('actions.publish')}
      </Button>
      <Dialog
        open={confirming}
        onClose={close}
        title={t('publishDialog.title')}
        description={t('publishDialog.body', { missing })}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close}>
            {c('cancel')}
          </Button>
          <Button
            pending={pending}
            onClick={() => {
              run(true);
            }}
          >
            {t('publishDialog.confirm')}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

/** Delete (with confirmation) or restore an exam. Deleting is soft: nothing is lost. */
export function ArchiveExamButton({ id, archived }: { id: string; archived: boolean }) {
  const t = useTranslations('grades');
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
      const res = await archiveExamAction(id, next);
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
