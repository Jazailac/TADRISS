import { useTranslations } from 'next-intl';
import { SiteHeader } from '@/components/site-header';
import { Link } from '@/i18n/navigation';

// Placeholder: the real login flow ships in Phase 1 (auth & onboarding).
export default function Page() {
  const t = useTranslations('placeholder');
  const nav = useTranslations('nav');

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-heading text-2xl font-bold">{nav('login')}</h1>
        <p className="mt-3 text-text-muted">{t('comingSoon')}</p>
        <Link href="/" className="mt-6 inline-block font-medium text-primary hover:underline">
          {t('backHome')}
        </Link>
      </main>
    </>
  );
}
