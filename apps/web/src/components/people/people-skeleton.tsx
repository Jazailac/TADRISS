import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

/** Loading state shaped like the real page, so nothing jumps when data arrives. */
export function PeopleSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-7" aria-busy="true">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="grid gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-64" />
        </div>
        <Skeleton className="h-11 w-44" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Card className="divide-y divide-border">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
