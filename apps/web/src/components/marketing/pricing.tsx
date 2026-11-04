import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '../ui/button';

export function Pricing() {
  const t = useTranslations('studio');
  return (
    <section
      className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-20"
      aria-labelledby="pricing-title"
    >
      <div className="grid gap-7 md:grid-cols-[1fr_auto] md:items-center md:gap-12">
        <div className="max-w-2xl">
          <span className="eyebrow text-accent">{t('pricingLabel')}</span>
          <h2
            id="pricing-title"
            className="display mt-4 text-3xl font-medium tracking-tight sm:text-4xl"
          >
            {t('pricing')}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-text-muted">{t('pricingBody')}</p>
        </div>
        <ButtonLink href="/signup" variant="secondary" className="group w-fit">
          {t('create')}
          <ArrowUpRight
            className="rtl-flip size-4 transition-transform duration-200 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </ButtonLink>
      </div>
    </section>
  );
}
