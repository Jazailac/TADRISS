import { ArrowRight, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '../ui/button';
import { ZelligePattern } from '../ui/pattern';
import { ProductPreview } from './product-preview';

const points = ['languages', 'currency', 'platforms'] as const;

export function Hero() {
  const t = useTranslations('home.hero');
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10">
        <ZelligePattern className="text-primary/[0.07] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div className="absolute -top-40 start-1/2 h-[36rem] w-[64rem] -translate-x-1/2 rounded-full bg-primary-soft/60 blur-3xl rtl:translate-x-1/2 dark:bg-primary-soft/40" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-16 pb-20 md:px-8 md:pt-24 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pb-28">
        <div className="animate-rise">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="display mt-5 text-[2.75rem] font-medium sm:text-6xl lg:text-[4.25rem]">
            {t.rich('title', { em: (chunks) => <em className="text-primary italic">{chunks}</em> })}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-muted">{t('subtitle')}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/signup" size="lg" className="group">
              {t('ctaPrimary')}
              <ArrowRight
                className="rtl-flip size-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                aria-hidden
              />
            </ButtonLink>
            <ButtonLink href="/login" size="lg" variant="secondary">
              {t('ctaSecondary')}
            </ButtonLink>
          </div>
          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-muted">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <Check className="size-4 text-primary" strokeWidth={2.25} aria-hidden />
                {t(`points.${p}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-rise [animation-delay:120ms] lg:-me-10">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
