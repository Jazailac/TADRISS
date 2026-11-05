import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '../ui/button';
import { Logo } from '../ui/logo';
import { CourtyardLines } from './courtyard-lines';

export function ClosingCta() {
  const t = useTranslations('home.cta');
  const s = useTranslations('studio');
  return (
    <section className="auth-architecture closing-courtyard">
      <CourtyardLines className="closing-lines" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow text-ink-muted">{s('footerNote')}</p>
          <h2 className="display closing-title mt-6 max-w-3xl font-medium">{t('title')}</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-ink-muted">{t('body')}</p>
        </div>
        <ButtonLink
          href="/signup"
          size="lg"
          variant="secondary"
          className="hero-primary group w-fit lg:mb-2"
        >
          {t('button')}
          <ArrowRight
            className="rtl-flip size-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
            aria-hidden
          />
        </ButtonLink>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const t = useTranslations('home.footer');
  const nav = useTranslations('nav');
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-10">
        <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
          <div>
            <Link href="/" className="inline-flex rounded-md" aria-label={nav('home')}>
              <Logo className="text-text" />
            </Link>
            <p className="mt-3 text-xs text-text-muted">{t('tagline')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-text-muted">
            <Link href="/login" className="transition-colors hover:text-primary">
              {nav('login')}
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-primary">
              {t('privacy')}
            </Link>
          </div>
        </div>
        <p className="mt-8 border-t border-border pt-5 font-mono text-[0.65rem] text-text-muted tabular-nums">
          {t('rights', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
