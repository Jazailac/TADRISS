import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export default function NotFound() {
  const t = useTranslations('platform');
  return (
    <div className="mx-auto grid grid-cols-1 max-w-3xl gap-7">
      <Card>
        <EmptyState
          heading="h1"
          title={t('notFound.title')}
          description={t('notFound.body')}
          action={
            <ButtonLink
              href="/admin/institutions"
              variant="secondary"
              icon={<ArrowLeft className="rtl-flip size-4" aria-hidden />}
            >
              {t('detail.back')}
            </ButtonLink>
          }
        />
      </Card>
    </div>
  );
}
