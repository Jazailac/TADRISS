import type { AnnouncementView } from '@tadriss/shared';
import { getFormatter, getTranslations } from 'next-intl/server';
import { ChevronRight, Pin } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Badge } from '../ui/badge';
import { EmptyLine } from './dash-parts';

/** The newest announcements as compact rows linking to the full text. */
export async function AnnouncementsLatest({
  items,
  base,
  timeZone,
}: {
  items: AnnouncementView[];
  base: string;
  timeZone: string;
}) {
  const [t, f] = await Promise.all([getTranslations('dashboard.announcements'), getFormatter()]);
  if (items.length === 0) return <EmptyLine>{t('none')}</EmptyLine>;
  return (
    <ul aria-label={t('list')} className="grid grid-cols-1 divide-y divide-border/70">
      {items.map((a) => (
        <li key={a.id} className="min-w-0">
          <Link
            href={`${base}/${a.id}`}
            className="group grid gap-2 rounded-md py-4 transition-colors hover:text-primary"
          >
            <div className="flex items-center gap-2">
              {a.read ? null : (
                <Badge tone="primary" dot>
                  {t('unread')}
                </Badge>
              )}
              {a.pinned ? <Pin className="size-3.5 shrink-0 text-accent" aria-hidden /> : null}
              <span className="ms-auto font-mono text-[0.65rem] tabular-nums text-text-muted">
                {f.dateTime(new Date(a.createdAt), { day: 'numeric', month: 'short', timeZone })}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="min-w-0 flex-1 text-sm font-medium leading-relaxed" dir="auto">
                <bdi>{a.title}</bdi>
              </span>
              <ChevronRight
                className="rtl-flip mt-1 size-3.5 shrink-0 text-text-muted/50 group-hover:text-primary"
                aria-hidden
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
