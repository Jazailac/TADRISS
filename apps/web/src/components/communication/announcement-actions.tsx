'use client';

import { ArchiveRestore, CheckCheck, Pin, PinOff, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useTransition } from 'react';
import {
  archiveAnnouncementAction,
  markAnnouncementsReadAction,
  pinAnnouncementAction,
} from '@/app/actions/announcements';
import { useRouter } from '@/i18n/navigation';
import { Button } from '../ui/button';
import { useToast } from '../ui/toast';

/** Soft delete or restore. Deleting is reversible, so there is no confirmation step. */
export function ArchiveAnnouncementButton({ id, archived }: { id: string; archived: boolean }) {
  const t = useTranslations('announcements');
  const e = useTranslations('errors');
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      variant={archived ? 'secondary' : 'ghost'}
      size="sm"
      pending={pending}
      icon={
        archived ? (
          <ArchiveRestore className="size-4" aria-hidden />
        ) : (
          <Trash2 className="size-4" aria-hidden />
        )
      }
      onClick={() => {
        start(async () => {
          const res = await archiveAnnouncementAction(id, !archived);
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

export function PinAnnouncementButton({ id, pinned }: { id: string; pinned: boolean }) {
  const t = useTranslations('announcements');
  const e = useTranslations('errors');
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      pending={pending}
      icon={
        pinned ? <PinOff className="size-4" aria-hidden /> : <Pin className="size-4" aria-hidden />
      }
      onClick={() => {
        start(async () => {
          const res = await pinAnnouncementAction(id, !pinned);
          if (res.ok) {
            toast.success(t(pinned ? 'feedback.unpinned' : 'feedback.pinned'));
            router.refresh();
          } else toast.error(e(res.error));
        });
      }}
    >
      {t(pinned ? 'actions.unpin' : 'actions.pin')}
    </Button>
  );
}

/** Opening an announcement marks it read. Fired once, from an effect (never during render). */
export function MarkRead({ id }: { id: string }) {
  const fired = useRef(false);
  const router = useRouter();
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void markAnnouncementsReadAction([id]).then((res) => {
      if (res.ok) router.refresh();
    });
  }, [id, router]);
  return null;
}

export function MarkAllReadButton({ ids }: { ids: string[] }) {
  const t = useTranslations('announcements');
  const e = useTranslations('errors');
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      pending={pending}
      icon={<CheckCheck className="size-4" aria-hidden />}
      onClick={() => {
        start(async () => {
          const res = await markAnnouncementsReadAction(ids);
          if (res.ok) router.refresh();
          else toast.error(e(res.error));
        });
      }}
    >
      {t('actions.markAllRead')}
    </Button>
  );
}
