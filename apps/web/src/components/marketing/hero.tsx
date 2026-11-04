import { ArrowDown, ArrowRight, Globe2, Smartphone, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SchoolStudio } from './school-studio';
import { ButtonLink } from '../ui/button';
import { CourtyardLines } from './courtyard-lines';

const details = [
  { key: 'languages', icon: Globe2 },
  { key: 'currency', icon: Wallet },
  { key: 'platforms', icon: Smartphone },
] as const;

export function Hero() {
  const t = useTranslations('studio');
  const home = useTranslations('home.hero');
  return (
    <section className="hero-world">
      <CourtyardLines className="hero-linework" />
      <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-12 md:px-10 md:pb-14 md:pt-16">
        <p className="eyebrow hero-eyebrow flex items-center gap-3">
          <span className="h-px w-8 bg-ink-muted" aria-hidden />
          {t('eyebrow')}
        </p>
        <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-[1.45fr_0.8fr] lg:items-end lg:gap-16">
          <h1 className="hero-heading min-w-0">{t.rich('hero', { br: () => <br /> })}</h1>
          <div className="min-w-0 lg:pb-2">
            <p className="max-w-md text-base leading-7 text-ink-muted md:text-lg md:leading-8">
              {t('intro')}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <ButtonLink
                href="/signup"
                variant="secondary"
                size="lg"
                className="group hero-primary"
              >
                {home('ctaPrimary')}
                <ArrowRight
                  className="rtl-flip size-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                  aria-hidden
                />
              </ButtonLink>
              <a
                href="#school-studio"
                className="inline-flex items-center gap-2 py-3 text-sm font-medium text-ink-foreground underline-offset-4 hover:underline"
              >
                {t('build')}
                <ArrowDown className="size-4" aria-hidden />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-10 md:mt-14">
          <SchoolStudio />
        </div>
        <div className="mt-6 flex flex-wrap justify-between gap-x-8 gap-y-3 text-[0.6875rem] text-ink-muted">
          {details.map(({ key, icon: Icon }) => (
            <span key={key} className="flex items-center gap-2.5">
              <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
              {home(`points.${key}`)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
