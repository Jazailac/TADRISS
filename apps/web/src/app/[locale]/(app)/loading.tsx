import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  const t = useTranslations('common');
  return (
    <div
      className="mx-auto grid grid-cols-1 max-w-6xl gap-7"
      aria-busy="true"
      role="status"
      aria-label={t('loading')}
    >
      <div className="grid gap-4">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-12 w-3/4 max-w-md" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-[1.3fr_.8fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
