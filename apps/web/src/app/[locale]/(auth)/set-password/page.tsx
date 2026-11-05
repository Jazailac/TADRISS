import { KeyRound } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { choosePassword } from '@/app/actions/auth';
import { AuthForm } from '@/components/auth/auth-form';
import { redirect } from '@/i18n/navigation';
import { getViewer } from '@/lib/viewer';

/** Where an invitee lands after `/auth/confirm` created their session. */
export default async function SetPasswordPage() {
  const [viewer, locale, t] = await Promise.all([
    getViewer(),
    getLocale(),
    getTranslations('auth.setPassword'),
  ]);
  if (!viewer) return redirect({ href: '/login?error=link', locale });
  return (
    <>
      <span className="auth-page-mark">
        <KeyRound className="size-5" strokeWidth={1.5} aria-hidden />
      </span>
      <h1 className="display auth-form-title font-medium">{t('title')}</h1>
      <p className="mt-3 text-sm leading-7 text-text-muted">{t('subtitle')}</p>
      <div className="mt-9">
        <AuthForm
          schema="setPassword"
          action={choosePassword}
          submitLabel={t('submit')}
          fields={[
            {
              name: 'password',
              label: t('fields.password'),
              kind: 'password',
              autoComplete: 'new-password',
            },
            {
              name: 'confirm',
              label: t('fields.confirm'),
              kind: 'password',
              autoComplete: 'new-password',
            },
          ]}
        />
      </div>
    </>
  );
}
