import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '../ui/button';
import { Logo } from '../ui/logo';
import { ZelligePattern } from '../ui/pattern';

export function ClosingCta() {
  const t = useTranslations('home.cta');
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 md:px-8">
      <div className="relative isolate overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground shadow-lg sm:px-16">
        <ZelligePattern className="-z-10 text-primary-foreground/[0.08]" size={64} />
        <h2 className="display mx-auto max-w-2xl text-4xl font-medium sm:text-5xl">{t('title')}</h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-primary-foreground/80">{t('body')}</p>
        <ButtonLink href="/signup" size="lg" variant="secondary" className="group mt-9">
          {t('button')}
          <ArrowRight className="rtl-flip size-4" aria-hidden />
        </ButtonLink>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const t = useTranslations('home.footer');
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-sm text-text-muted md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-4">
          <Logo className="text-text" />
          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
          <span className="hidden sm:block">{t('tagline')}</span>
        </div>
        <p className="font-mono text-xs tabular-nums">
          {t('rights', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
