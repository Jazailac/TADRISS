'use client';

import { ArchiveRestore, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { archiveDocumentAction } from '@/app/actions/documents';
import { useRouter } from '@/i18n/navigation';
import { Button } from '../ui/button';
import { useToast } from '../ui/toast';

/** Soft delete or restore (the file stays in Storage), so no confirmation step. */
export function ArchiveDocumentButton({
  id,
  title,
  archived,
}: {
  id: string;
  title: string;
  archived: boolean;
}) {
  const t = useTranslations('documents');
  const e = useTranslations('errors');
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      variant={archived ? 'secondary' : 'ghost'}
      size="sm"
      pending={pending}
      aria-label={t(archived ? 'actions.restoreNamed' : 'actions.deleteNamed', { title })}
      icon={
        archived ? (
          <ArchiveRestore className="size-4" aria-hidden />
        ) : (
          <Trash2 className="size-4" aria-hidden />
        )
      }
      onClick={() => {
        start(async () => {
          const res = await archiveDocumentAction(id, !archived);
          if (res.ok) {
            toast.success(t(archived ? 'feedback.restored' : 'feedback.deleted'));
            router.refresh();
          } else toast.error(e(res.error));
        });
      }}
    >
      {t(archived ? 'actions.restore' : 'actions.delete')}
    </Button>
  );
}
