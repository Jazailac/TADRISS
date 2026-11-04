import { AlertCircle, LogIn } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { login } from '@/app/actions/auth';
import { AuthForm } from '@/components/auth/auth-form';
import { Link } from '@/i18n/navigation';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const [{ next, error }, t, n] = await Promise.all([
    searchParams,
    getTranslations('auth.login'),
    getTranslations('auth.notices'),
  ]);
  return (
    <>
      <span className="auth-page-mark">
        <LogIn className="size-5" strokeWidth={1.5} aria-hidden />
      </span>
      <h1 className="display auth-form-title font-medium">{t('title')}</h1>
      <p className="mt-3 text-sm leading-7 text-text-muted">{t('subtitle')}</p>
      {error === 'link' ? (
        <p
          role="alert"
          className="mt-6 flex gap-2.5 rounded-lg bg-warning-soft p-3.5 text-sm text-warning"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {n('linkExpired')}
        </p>
      ) : null}
      <div className="mt-9">
        <AuthForm
          schema="login"
          action={login}
          next={next}
          submitLabel={t('submit')}
          fields={[
            {
              name: 'email',
              label: t('fields.email'),
              placeholder: t('placeholders.email'),
              kind: 'email',
              autoComplete: 'email',
            },
            {
              name: 'password',
              label: t('fields.password'),
              kind: 'password',
              autoComplete: 'current-password',
            },
          ]}
        />
      </div>
      <p className="mt-7 text-sm leading-6 text-text-muted">
        {t('noAccount')}{' '}
        <Link
          href="/signup"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('signupLink')}
        </Link>
      </p>
    </>
  );
}
