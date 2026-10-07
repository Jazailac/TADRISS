import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export default function NotFound() {
  const t = useTranslations('finance');
  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-7">
      <Card>
        <EmptyState
          heading="h1"
          title={t('notFound.title')}
          description={t('notFound.body')}
          action={
            <ButtonLink
              href="/dashboard/finance"
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
