'use client';

import { Mail, Undo2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { resendInvitation, revokeInvitation } from '@/app/actions/people';
import { Spinner } from '../ui/spinner';
import { useToast } from '../ui/toast';

const iconButton =
  'grid size-10 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:opacity-60';

/** Resend / revoke for one open invitation. */
export function InvitationActions({ id, email }: { id: string; email: string }) {
  const t = useTranslations('people');
  const e = useTranslations('errors');
  const locale = useLocale();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<'resend' | 'revoke' | null>(null);

  const run = (kind: 'resend' | 'revoke') => {
    setWhich(kind);
    start(async () => {
      const res =
        kind === 'resend' ? await resendInvitation(id, locale) : await revokeInvitation(id);
      if (res.ok) toast.success(t(kind === 'resend' ? 'feedback.resent' : 'feedback.revoked'));
      else toast.error(e(res.error));
    });
  };

  return (
    <div className="flex items-center">
      <button
        type="button"
        className={iconButton}
        disabled={pending}
        aria-label={t('actions.resendLabel', { email })}
        title={t('actions.resend')}
        onClick={() => {
          run('resend');
        }}
      >
        {pending && which === 'resend' ? (
          <Spinner label={false} />
        ) : (
          <Mail className="size-4" aria-hidden />
        )}
      </button>
      <button
        type="button"
        className={iconButton}
        disabled={pending}
        aria-label={t('actions.revokeLabel', { email })}
        title={t('actions.revoke')}
        onClick={() => {
          run('revoke');
        }}
      >
        {pending && which === 'revoke' ? (
          <Spinner label={false} />
        ) : (
          <Undo2 className="rtl-flip size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
