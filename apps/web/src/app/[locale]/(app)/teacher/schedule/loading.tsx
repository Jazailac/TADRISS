import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="mx-auto grid max-w-6xl gap-7" aria-busy="true">
      <div className="grid gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-64" />
      </div>
      <Skeleton className="h-16" />
      <Skeleton className="h-[34rem]" />
    </div>
  );
}
