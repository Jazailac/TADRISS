import { useTranslations } from 'next-intl';
import { ButtonLink } from '../ui/button';

/** Shown only when the deployment enables the public demo (`DEMO_PASSWORD`). */
export function DemoStrip() {
  const t = useTranslations('demoSchool');
  return (
    <section className="mx-auto max-w-6xl px-5 pt-16 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface-muted p-6">
        <div className="min-w-0">
          <h2 className="display text-2xl">{t('title')}</h2>
          <p className="mt-1 max-w-xl text-sm text-text-muted">{t('stripBody')}</p>
        </div>
        <ButtonLink href="/demo">{t('cta')}</ButtonLink>
      </div>
    </section>
  );
}
