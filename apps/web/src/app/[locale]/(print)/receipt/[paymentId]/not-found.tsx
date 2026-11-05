import { useTranslations } from 'next-intl';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export default function NotFound() {
  const t = useTranslations('finance');
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Card>
        <EmptyState
          heading="h1"
          title={t('notFound.title')}
          description={t('notFound.body')}
          action={<ButtonLink href="/">{t('receipt.back')}</ButtonLink>}
        />
      </Card>
    </main>
  );
}
