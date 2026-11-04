'use client';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Logo } from '@/components/ui/logo';
import { Link } from '@/i18n/navigation';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('errors');
  const nav = useTranslations('nav');
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-5 py-12">
      <Link href="/" className="rounded-md" aria-label={nav('home')}>
        <Logo />
      </Link>
      <div className="public-recovery mt-10 w-full rounded-2xl border border-border bg-surface p-4 shadow-xs">
        <EmptyState
          heading="h1"
          title={t('genericTitle')}
          description={t('unknown')}
          action={<Button onClick={reset}>{t('retry')}</Button>}
        />
      </div>
    </main>
  );
}
