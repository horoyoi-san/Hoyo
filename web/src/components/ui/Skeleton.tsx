import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton h-4 w-full', className)} />;
}

/** Full-page skeleton shown while a lazily-loaded view chunk downloads. */
export function ViewSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-fade-in" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 !rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <Skeleton className="h-36 !rounded-xl" />
        <Skeleton className="h-36 !rounded-xl" />
        <Skeleton className="h-36 !rounded-xl" />
        <Skeleton className="h-36 !rounded-xl" />
      </div>
    </div>
  );
}
