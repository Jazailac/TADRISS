import { addDays, getContact, listThread, todayIn, type Message } from '@tadriss/shared';
import { ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { cx } from '../ui/cx';
import type { Area } from './area';
import { Composer, MarkThreadRead, ScrollToEnd, ThreadAutoRefresh } from './thread-client';

/** A day key in the school's timezone, e.g. `2026-10-07`. */
const dayKey = (iso: string, tz: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(iso));

export async function ThreadPage({ area, otherId }: { area: Area; otherId: string }) {
  const viewer = await getViewer();
  const tz = viewer?.profile.institution?.timezone ?? 'Africa/Casablanca';
  const myId = viewer?.session.userId ?? '';
  const supabase = await getServerClient();
  const [t, f, contact, thread] = await Promise.all([
    getTranslations('messages'),
    getFormatter(),
    getContact(supabase, otherId),
    listThread(supabase, myId, otherId),
  ]);
  // A person we can no longer see is still a valid thread if we have history with them.
  if (!thread.ok || (!contact.ok && thread.data.length === 0)) notFound();

  const messages = thread.data;
  const name = contact.ok
    ? `${contact.data.firstName} ${contact.data.lastName}`
    : t('list.unknown');
  const today = todayIn(tz);
  const yesterday = addDays(today, -1);
  const hasUnread = messages.some((m) => !m.fromMe && m.readAt === null);

  const groups: { key: string; items: Message[] }[] = [];
  for (const m of messages) {
    const key = dayKey(m.createdAt, tz);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(m);
    else groups.push({ key, items: [m] });
  }
  const dayLabel = (key: string, sample: string) =>
    key === today
      ? t('thread.today')
      : key === yesterday
        ? t('thread.yesterday')
        : f.dateTime(new Date(sample), { dateStyle: 'full', timeZone: tz });

  return (
    <div className="mx-auto grid grid-cols-1 max-w-3xl gap-5">
      <MarkThreadRead otherId={otherId} unread={hasUnread} />
      <ThreadAutoRefresh />
      <Link
        href={`/${area}/messages`}
        className="inline-flex w-fit items-center gap-2 text-sm text-text-muted hover:text-primary"
      >
        <ArrowLeft className="rtl-flip size-4" aria-hidden />
        {t('thread.back')}
      </Link>

      <header className="flex items-center gap-4">
        <Avatar
          first={contact.ok ? contact.data.firstName : ''}
          last={contact.ok ? contact.data.lastName : ''}
          seed={otherId}
          className="size-12"
        />
        <div className="min-w-0">
          <h1 className="display truncate text-2xl md:text-3xl">
            <bdi>{name}</bdi>
          </h1>
          {contact.ok ? <Badge className="mt-1">{t(`roles.${contact.data.role}`)}</Badge> : null}
        </div>
      </header>

      <section aria-label={t('thread.messages')} className="grid gap-5">
        {groups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-strong p-8 text-center text-sm text-text-muted">
            {t('thread.empty')}
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.key} className="grid gap-2">
              <p className="mx-auto rounded-full bg-surface-muted px-3 py-1 text-xs text-text-muted">
                {dayLabel(g.key, g.items[0]?.createdAt ?? '')}
              </p>
              <ul className="grid gap-2">
                {g.items.map((m) => (
                  <li key={m.id} className={cx('flex', m.fromMe ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cx(
                        'max-w-[85%] rounded-2xl px-4 py-2.5 shadow-xs',
                        m.fromMe
                          ? 'rounded-ee-md bg-primary text-primary-foreground'
                          : 'rounded-es-md border border-border bg-surface',
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words" dir="auto">
                        {m.body}
                      </p>
                      <p
                        className={cx(
                          'mt-1 flex items-center justify-end gap-1.5 font-mono text-[11px] tabular-nums',
                          m.fromMe ? 'text-primary-foreground/75' : 'text-text-muted',
                        )}
                      >
                        {f.dateTime(new Date(m.createdAt), {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: tz,
                        })}
                        {m.fromMe ? (
                          <>
                            {m.readAt ? (
                              <CheckCheck className="size-3.5" aria-hidden />
                            ) : (
                              <Check className="size-3.5" aria-hidden />
                            )}
                            <span className="sr-only">
                              {m.readAt ? t('thread.read') : t('thread.sent')}
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
        <ScrollToEnd count={messages.length} />
      </section>

      {contact.ok ? (
        <div className="sticky bottom-0 -mx-1 px-1 pb-2">
          <Composer recipientId={otherId} />
        </div>
      ) : null}
    </div>
  );
}
