import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import type { Area } from './area';

/** In-shell "not found" for an announcement or a conversation. */
export function CommunicationNotFound({
  area,
  kind,
}: {
  area: Area;
  kind: 'announcements' | 'messages';
}) {
  const t = useTranslations(kind);
  return (
    <div className="mx-auto grid grid-cols-1 max-w-3xl gap-7">
      <Card>
        <EmptyState
          heading="h1"
          title={t('notFound.title')}
          description={t('notFound.body')}
          action={
            <ButtonLink
              href={`/${area}/${kind}`}
              variant="secondary"
              icon={<ArrowLeft className="rtl-flip size-4" aria-hidden />}
            >
              {kind === 'messages' ? t('thread.back') : t('detail.back')}
            </ButtonLink>
          }
        />
      </Card>
    </div>
  );
}
