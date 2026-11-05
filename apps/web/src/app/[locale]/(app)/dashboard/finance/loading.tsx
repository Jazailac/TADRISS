import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-7" aria-busy="true">
      <div className="grid gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-56" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
