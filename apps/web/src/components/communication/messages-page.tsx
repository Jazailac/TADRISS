import { listContacts, listConversations, type Conversation } from '@tadriss/shared';
import { AlertCircle } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';
import type { Area } from './area';
import { NewMessageButton } from './new-message-dialog';

const n = (chunks: React.ReactNode) => <bdi>{chunks}</bdi>;

export async function MessagesPage({ area }: { area: Area }) {
  const viewer = await getViewer();
  const tz = viewer?.profile.institution?.timezone ?? 'Africa/Casablanca';
  const supabase = await getServerClient();
  const [t, shell, errors, f, conversations, contacts] = await Promise.all([
    getTranslations('messages'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getFormatter(),
    listConversations(supabase),
    listContacts(supabase, viewer?.session.userId ?? ''),
  ]);

  const head = (actions?: React.ReactNode) => (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow">{shell('communication')}</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
        <p className="mt-3 max-w-xl text-text-muted">
          {t(`subtitle.${area === 'dashboard' ? 'admin' : area}`)}
        </p>
      </div>
      {actions}
    </header>
  );

  if (!conversations.ok) {
    return (
      <div className="mx-auto grid grid-cols-1 max-w-3xl gap-7">
        {head()}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href={`/${area}/messages`} variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const newButton = <NewMessageButton area={area} contacts={contacts.ok ? contacts.data : []} />;

  return (
    <div className="mx-auto grid grid-cols-1 max-w-3xl gap-7">
      {head(newButton)}
      {conversations.data.length === 0 ? (
        <Card>
          <EmptyState title={t('empty.title')} description={t('empty.body')} action={newButton} />
        </Card>
      ) : (
        <ul aria-label={t('list.label')} className="grid grid-cols-1 gap-2">
          {conversations.data.map((c) => (
            <ConversationRow
              key={c.otherId}
              c={c}
              area={area}
              t={t}
              time={f.dateTime(new Date(c.lastAt), {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: tz,
              })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ConversationRow({
  c,
  area,
  t,
  time,
}: {
  c: Conversation;
  area: Area;
  t: Awaited<ReturnType<typeof getTranslations<'messages'>>>;
  time: string;
}) {
  const name = `${c.firstName} ${c.lastName}`.trim();
  return (
    <li className="min-w-0">
      <Link
        href={`/${area}/messages/${c.otherId}`}
        aria-label={t('list.open', { name: name || t('list.unknown') })}
        className={cx(
          'flex items-center gap-4 rounded-xl border bg-surface p-4 shadow-sm transition-[box-shadow,border-color] hover:border-border-strong hover:shadow-md',
          c.unread > 0 ? 'border-primary/40' : 'border-border',
        )}
      >
        <Avatar first={c.firstName} last={c.lastName} seed={c.otherId} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className={cx('truncate', c.unread > 0 ? 'font-semibold' : 'font-medium')}>
              <bdi>{name || t('list.unknown')}</bdi>
            </p>
            {c.role ? <Badge>{t(`roles.${c.role}`)}</Badge> : null}
          </div>
          <p
            className={cx('truncate text-sm', c.unread > 0 ? 'text-text' : 'text-text-muted')}
            dir="auto"
          >
            {c.lastFromMe ? t.rich('list.you', { text: c.lastBody, n }) : c.lastBody}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="font-mono text-xs tabular-nums text-text-muted">{time}</span>
          {c.unread > 0 ? (
            <span className="grid min-w-6 place-items-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground tabular-nums">
              {c.unread}
            </span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
