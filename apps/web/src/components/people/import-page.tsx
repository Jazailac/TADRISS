import { getTranslations } from 'next-intl/server';
import { ImportForm } from './import-form';

export async function ImportPage() {
  const [t, shell] = await Promise.all([
    getTranslations('import'),
    getTranslations('shell.groups'),
  ]);
  return (
    <div className="mx-auto grid grid-cols-1 max-w-4xl gap-7">
      <header>
        <p className="eyebrow">{shell('school')}</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
        <p className="mt-3 max-w-xl text-text-muted">{t('subtitle')}</p>
      </header>
      <ImportForm />
    </div>
  );
}
