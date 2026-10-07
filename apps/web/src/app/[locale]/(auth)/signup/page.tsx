import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { signup } from '@/app/actions/auth';
import { AuthForm } from '@/components/auth/auth-form';
import { Link } from '@/i18n/navigation';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolType?: string; modules?: string; role?: string }>;
}) {
  const [t, s, query] = await Promise.all([
    getTranslations('auth.signup'),
    getTranslations('studio'),
    searchParams,
  ]);
  const types = ['primary', 'college', 'lycee', 'support'] as const;
  const modules = ['attendance', 'grades', 'schedule', 'finance'] as const;
  const selectedType = types.find((type) => type === query.schoolType);
  const selectedModules = modules.filter((module) => query.modules?.split(',').includes(module));
  return (
    <>
      <h1 className="display text-4xl font-medium">{t('title')}</h1>
      <p className="mt-3 text-text-muted">{t('subtitle')}</p>
      {selectedType ? (
        <div className="mt-5 rounded-xl border border-primary/20 bg-primary-soft/40 p-4">
          <p className="text-xs font-semibold text-primary">{s('selected')}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="info">{s(selectedType)}</Badge>
            {selectedModules.map((module) => (
              <Badge key={module} tone="neutral">
                {s(module)}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">{s('configNote')}</p>
        </div>
      ) : null}
      <div className="mt-9">
        <AuthForm
          schema="signup"
          action={signup}
          submitLabel={t('submit')}
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
