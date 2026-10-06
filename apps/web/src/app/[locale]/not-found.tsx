import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-content-center gap-4 px-6 text-center">
      <h1 className="font-heading text-2xl font-bold">{t('title')}</h1>
      <p className="text-text-muted">{t('body')}</p>
      <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
        {t('backHome')}
      </Link>
    </main>
  );
}
