'use client';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Logo } from '@/components/ui/logo';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('errors');
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-5 py-12">
      <Logo />
      <div className="mt-10 w-full rounded-3xl border border-border bg-surface p-4 shadow-lg">
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
