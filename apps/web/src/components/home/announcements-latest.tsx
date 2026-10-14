import type { AnnouncementView } from '@tadriss/shared';
import { getFormatter, getTranslations } from 'next-intl/server';
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
    <ul aria-label={t('list')} className="grid grid-cols-1 divide-y divide-border">
      {items.map((a) => (
        <li key={a.id} className="min-w-0">
          <Link
            href={`${base}/${a.id}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 hover:text-primary"
          >
            {a.read ? null : (
              <Badge tone="primary" dot>
                {t('unread')}
              </Badge>
            )}
            <span className="min-w-0 flex-1 basis-40 truncate font-medium" dir="auto">
              <bdi>{a.title}</bdi>
            </span>
            <span className="font-mono text-xs tabular-nums text-text-muted">
              {f.dateTime(new Date(a.createdAt), { day: 'numeric', month: 'short', timeZone })}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
