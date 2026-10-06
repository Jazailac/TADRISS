import { useTranslations } from 'next-intl';
import { AuthForm } from '@/components/auth/auth-form';
import { Link } from '@/i18n/navigation';

export default function SignupPage() {
  const t = useTranslations('auth.signup');
  return (
    <>
      <h1 className="display text-4xl font-medium">{t('title')}</h1>
      <p className="mt-3 text-text-muted">{t('subtitle')}</p>
      <div className="mt-9">
        <AuthForm
          schema="signup"
          submitLabel={t('submit')}
          notice={t('notice')}
          fields={[
            {
              name: 'institutionName',
              label: t('fields.institutionName'),
              placeholder: t('placeholders.institutionName'),
              kind: 'text',
              autoComplete: 'organization',
            },
            {
              name: 'firstName',
              label: t('fields.firstName'),
              placeholder: t('placeholders.firstName'),
              kind: 'text',
              autoComplete: 'given-name',
              half: true,
            },
            {
              name: 'lastName',
              label: t('fields.lastName'),
              placeholder: t('placeholders.lastName'),
              kind: 'text',
              autoComplete: 'family-name',
              half: true,
            },
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
              autoComplete: 'new-password',
            },
          ]}
        />
      </div>
      <p className="mt-8 text-sm text-text-muted">
        {t('hasAccount')}{' '}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          {t('loginLink')}
        </Link>
      </p>
    </>
  );
}
