import { ArrowUpRight, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';

export function Pricing() {
  const t = useTranslations('studio');

  return (
    <section
      className="mx-auto max-w-6xl px-5 py-[var(--space-section)] md:px-8"
      aria-labelledby="pricing-title"
    >
      <Card className="relative isolate overflow-hidden border-primary/20 bg-surface p-8 shadow-md sm:p-12">
        <div
          className="pointer-events-none absolute -end-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-2xl">
            <span className="eyebrow text-primary">{t('pricingLabel')}</span>
            <h2
              id="pricing-title"
              className="display mt-3 text-3xl font-medium tracking-tight sm:text-4xl"
            >
              {t('pricing')}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-text-muted">{t('pricingBody')}</p>
          </div>
          <ButtonLink href="/signup" variant="secondary" className="group w-fit">
            <Sparkles className="size-4 text-accent" aria-hidden />
            {t('create')}
            <ArrowUpRight
              className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </ButtonLink>
        </div>
      </Card>
    </section>
  );
}
