import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

/** In-shell "not found" for an id that is missing, malformed, not a student or another school's. */
export default function NotFound() {
  const t = useTranslations('studentFile');
  return (
    <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-6xl gap-7">
      <Card>
        <EmptyState
          heading="h1"
          title={t('notFound.title')}
          description={t('notFound.body')}
          action={
            <ButtonLink
              href="/dashboard/students"
              variant="secondary"
              icon={<ArrowLeft className="rtl-flip size-4" aria-hidden />}
            >
              {t('back')}
            </ButtonLink>
          }
        />
      </Card>
    </div>
  );
}
