import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { SiteFooter } from '@/components/marketing/closing';
import { SiteHeader } from '@/components/site-header';

const sections = [
  'who',
  'data',
  'why',
  'who_sees',
  'location',
  'rights',
  'security',
  'contact',
] as const;

export async function generateMetadata() {
  const t = await getTranslations('privacy');
  return { title: t('title') };
}

export default async function PrivacyPage() {
  const [t, f] = await Promise.all([getTranslations('privacy'), getFormatter()]);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-14 md:px-10 md:py-20">
        <header className="grid gap-8 border-b border-border pb-12 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-3xl">
            <p className="eyebrow text-accent">{t('eyebrow')}</p>
            <h1 className="display public-page-title mt-5">{t('title')}</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-text-muted">{t('intro')}</p>
          </div>
          <span
            className="hidden size-20 items-center justify-center rounded-2xl border border-primary/15 bg-primary-soft text-primary md:flex"
            aria-hidden
          >
            <ShieldCheck className="size-8" strokeWidth={1.25} />
          </span>
        </header>
        <div className="grid gap-10 pt-10 lg:grid-cols-[17rem_1fr] lg:gap-20 lg:pt-14">
          <nav
            aria-label={t('title')}
            className="privacy-index grid grid-cols-1 content-start gap-1 border-y border-border py-3 sm:grid-cols-2 lg:sticky lg:top-28 lg:grid-cols-1 lg:self-start"
          >
            {sections.map((section, i) => (
              <a
                key={section}
                href={`#p-${section}`}
                className="group flex items-center gap-3 py-3 text-sm text-text-muted transition-colors hover:text-primary"
              >
                <span className="font-mono text-[0.65rem] text-accent">
                  {f.number(i + 1, { minimumIntegerDigits: 2 })}
                </span>
                <span className="min-w-0 flex-1">{t(`${section}.title`)}</span>
                <ArrowUpRight
                  className="rtl-flip size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </a>
            ))}
          </nav>
          <div className="max-w-3xl divide-y divide-border">
            {sections.map((section, i) => (
              <section
                key={section}
                aria-labelledby={`p-${section}`}
                className="pb-9 pt-9 first:pt-0"
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-xs text-accent" aria-hidden>
                    {f.number(i + 1, { minimumIntegerDigits: 2 })}
                  </span>
                  <h2
                    id={`p-${section}`}
                    className="scroll-mt-28 text-xl font-semibold tracking-tight"
                  >
                    {t(`${section}.title`)}
                  </h2>
                </div>
                <p className="mt-4 text-base leading-8 text-text-muted">{t(`${section}.body`)}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
