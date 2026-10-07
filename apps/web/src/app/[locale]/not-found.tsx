import { useTranslations } from 'next-intl';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Logo } from '@/components/ui/logo';
export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-5 py-12">
      <Logo />
      <div className="mt-10 w-full rounded-3xl border border-border bg-surface p-4 shadow-lg">
        <p aria-hidden className="pt-8 text-center font-mono text-5xl text-primary/30">
          {404}
        </p>
        <EmptyState
          heading="h1"
          title={t('title')}
          description={t('body')}
          action={<ButtonLink href="/">{t('backHome')}</ButtonLink>}
        />
      </div>
    </main>
  );
}
