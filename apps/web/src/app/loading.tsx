import { Skeleton } from '@/components/ui';

export default function RootLoading() {
  return (
    <div className="space-y-5" role="status" aria-label="লোড হচ্ছে">
      <Skeleton className="h-9 w-2/3 max-w-md" />
      <Skeleton className="h-5 w-1/2 max-w-sm" />
      <div className="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 !rounded-2xl" />)}
      </div>
      <span className="sr-only">লোড হচ্ছে…</span>
    </div>
  );
}