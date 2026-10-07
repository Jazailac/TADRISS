import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';

/** In-shell "not found" for a class the viewer cannot see (missing, archived or someone else's). */
export function ClassNotFound({ back }: { back: string }) {
  const t = useTranslations('classes');
  return (
    <div className="mx-auto grid grid-cols-1 max-w-6xl gap-7">
      <Card>
        <EmptyState
          heading="h1"
          title={t('notFound.title')}
          description={t('notFound.body')}
          action={
            <ButtonLink
              href={back}
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
