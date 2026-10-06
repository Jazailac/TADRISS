import { useTranslations } from 'next-intl';
import { SiteHeader } from '@/components/site-header';
import { Link } from '@/i18n/navigation';

const features = ['attendance', 'grades', 'finance'] as const;

export default function HomePage() {
  const t = useTranslations('home');

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-24">
        <section className="max-w-2xl">
          <h1 className="font-heading text-4xl font-extrabold tracking-tight md:text-5xl">
            {t('heroTitle')}
          </h1>
          <p className="mt-4 text-lg text-text-muted">{t('heroSubtitle')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center rounded-md bg-primary px-6 font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('ctaPrimary')}
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-md border border-border bg-surface px-6 font-medium hover:bg-surface-muted"
            >
              {t('ctaSecondary')}
            </Link>
          </div>
        </section>
        <section id="features" className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article key={f} className="rounded-lg border border-border bg-surface p-6">
              <h2 className="font-heading text-lg font-semibold">{t(`features.${f}.title`)}</h2>
              <p className="mt-2 text-text-muted">{t(`features.${f}.body`)}</p>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
