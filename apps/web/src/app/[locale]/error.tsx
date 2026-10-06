'use client';

import { useTranslations } from 'next-intl';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('errors');
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-content-center gap-4 px-6 text-center">
      <h1 className="font-heading text-2xl font-bold">{t('genericTitle')}</h1>
      <p className="text-text-muted">{t('unknown')}</p>
      <button
        type="button"
        onClick={reset}
        className="h-11 rounded-md bg-primary px-6 font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t('retry')}
      </button>
    </main>
  );
}
