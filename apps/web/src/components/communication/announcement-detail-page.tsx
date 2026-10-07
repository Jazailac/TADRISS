import { getAnnouncement, getAnnouncementReach } from '@tadriss/shared';
import { ArrowLeft } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Meter } from '../ui/meter';
import { ArchiveAnnouncementButton, MarkRead, PinAnnouncementButton } from './announcement-actions';
import { EditAnnouncementButton } from './announcement-dialog';
import type { Area } from './area';

const n = (chunks: React.ReactNode) => <bdi>{chunks}</bdi>;

/** One announcement in full; opening it marks it read for the viewer. */
export async function AnnouncementDetailPage({ area, id }: { area: Area; id: string }) {
  const viewer = await getViewer();
  const tz = viewer?.profile.institution?.timezone ?? 'Africa/Casablanca';
  const userId = viewer?.session.userId ?? '';
  const supabase = await getServerClient();
  const [t, f, found] = await Promise.all([
    getTranslations('announcements'),
    getFormatter(),
    getAnnouncement(supabase, userId, id),
  ]);
  if (!found.ok) notFound();

  const a = found.data;
  const isAdmin = area === 'dashboard';
  const mine = a.authorId === userId;
  const manage = isAdmin || mine;
  const reachRes = manage ? await getAnnouncementReach(supabase, [a.id]) : null;
  const reach = reachRes?.ok ? reachRes.data.get(a.id) : undefined;

  return (
    <div className="mx-auto grid grid-cols-1 max-w-3xl gap-7">
      {a.read || a.archived ? null : <MarkRead id={a.id} />}
      <Link
        href={`/${area}/announcements`}
        className="inline-flex w-fit items-center gap-2 text-sm text-text-muted hover:text-primary"
      >
        <ArrowLeft className="rtl-flip size-4" aria-hidden />
        {t('detail.back')}
      </Link>

      <header className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {a.pinned ? <Badge tone="accent">{t('card.pinned')}</Badge> : null}
          <Badge>
            {a.audience === 'class'
              ? t.rich('audience.class', { name: a.className ?? '', n })
              : t(`audience.${a.audience}`)}
          </Badge>
        </div>
        <h1 className="display text-3xl md:text-4xl" dir="auto">
          <bdi>{a.title}</bdi>
        </h1>
        <p className="text-sm text-text-muted">
          {t.rich('card.by', { name: a.authorName, n })} ·{' '}
          <span className="font-mono tabular-nums">
            {f.dateTime(new Date(a.createdAt), {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: tz,
            })}
          </span>
        </p>
        {manage ? (
          <div className="flex flex-wrap items-center gap-2">
            {a.archived ? null : <EditAnnouncementButton announcement={a} />}
            {isAdmin && !a.archived ? <PinAnnouncementButton id={a.id} pinned={a.pinned} /> : null}
            <ArchiveAnnouncementButton id={a.id} archived={a.archived} />
          </div>
        ) : null}
      </header>

      {a.archived ? (
        <p role="note" className="rounded-lg bg-warning-soft p-4 text-sm text-warning">
          {t('detail.archivedNotice')}
        </p>
      ) : null}

      <Card className="p-6">
        <p className="whitespace-pre-wrap leading-relaxed" dir="auto">
          {a.body}
        </p>
      </Card>

      {reach ? (
        <Card className="p-5 sm:px-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">{t('detail.reachTitle')}</h2>
            <p className="font-mono text-sm tabular-nums text-text-muted">
              {t('card.reach', { read: reach.readCount, total: reach.audienceCount })}
            </p>
          </div>
          {reach.audienceCount > 0 ? (
            <Meter
              value={reach.readCount}
              max={reach.audienceCount}
              tone="neutral"
              label={t('detail.reachTitle')}
              className="mt-3"
            />
          ) : null}
          <p className="mt-3 text-sm text-text-muted">
            {reach.readCount === 0
              ? t('detail.reachNone')
              : reach.readCount >= reach.audienceCount
                ? t('detail.reachAll')
                : null}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
