import { ArrowUpRight, School } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '../ui/button';

/** Shown only when the deployment enables the public demo (`DEMO_PASSWORD`). */
export function DemoStrip() {
  const t = useTranslations('demoSchool');
  return (
    <section className="mx-auto max-w-7xl px-5 pb-10 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <School className="size-5" strokeWidth={1.5} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">{t('stripBody')}</p>
          </div>
        </div>
        <ButtonLink href="/demo" variant="secondary">
          {t('cta')}
          <ArrowUpRight className="rtl-flip size-4" aria-hidden />
        </ButtonLink>
      </div>
    </section>
  );
}
