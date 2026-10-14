import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('report');
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="display text-3xl">{t('notFound')}</h1>
    </main>
  );
}
