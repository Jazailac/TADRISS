import { getTranslations } from 'next-intl/server';
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
  const t = await getTranslations('privacy');
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-3xl grid-cols-1 gap-8 px-5 py-14 md:px-8">
        <header>
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
          <p className="mt-3 text-text-muted">{t('intro')}</p>
        </header>
        {sections.map((s) => (
          <section key={s} aria-labelledby={`p-${s}`}>
            <h2 id={`p-${s}`} className="text-xl font-semibold">
              {t(`${s}.title`)}
            </h2>
            <p className="mt-2 leading-relaxed text-text-muted">{t(`${s}.body`)}</p>
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
