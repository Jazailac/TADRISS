import { useTranslations } from 'next-intl';
import { AuthForm } from '@/components/auth/auth-form';
import { Link } from '@/i18n/navigation';

export default function LoginPage() {
  const t = useTranslations('auth.login');
  return (
    <>
      <h1 className="display text-4xl font-medium">{t('title')}</h1>
      <p className="mt-3 text-text-muted">{t('subtitle')}</p>
      <div className="mt-9">
        <AuthForm
          schema="login"
          submitLabel={t('submit')}
          notice={t('notice')}
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
      <p className="mt-8 text-sm text-text-muted">
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
