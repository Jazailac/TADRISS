import { ArrowDown, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { SchoolStudio } from './school-studio';

export function Hero() {
  const t = useTranslations('studio');
  const home = useTranslations('home.hero');
  return (
    <section className="hero-world">
      <div className="hero-orbit" aria-hidden />
      <div className="mx-auto grid grid-cols-1 max-w-7xl gap-12 px-5 py-12 md:px-10 md:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
        <div className="relative z-10">
          <p className="flex items-center gap-3 font-mono text-[0.65rem] tracking-[0.18em] text-ink-muted uppercase">
            <span className="h-px w-8 bg-ink-muted" aria-hidden />
            {t('eyebrow')}
          </p>
          <h1 className="hero-heading mt-6">{t.rich('hero', { br: () => <br /> })}</h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-ink-muted md:text-lg">
            {t('intro')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center gap-3 rounded-full bg-ink-foreground px-6 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5"
            >
              {home('ctaPrimary')}
              <ArrowRight className="rtl-flip size-4" aria-hidden />
            </Link>
            <a
              href="#school-studio"
              className="inline-flex items-center gap-2 py-3 text-sm text-ink-foreground underline-offset-4 hover:underline"
            >
              {t('build')}
              <ArrowDown className="size-4" aria-hidden />
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-5 gap-y-3 border-t border-ink-muted/25 pt-6 text-xs text-ink-muted">
            {(['languages', 'currency', 'platforms'] as const).map((key) => (
              <span key={key}>{home(`points.${key}`)}</span>
            ))}
          </div>
        </div>
        <SchoolStudio />
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 pb-8 text-[0.65rem] tracking-widest text-ink-muted md:px-10">
        <ArrowDown className="size-3" aria-hidden />
        {t('scroll')}
      </div>
    </section>
  );
}
