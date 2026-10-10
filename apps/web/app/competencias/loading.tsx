import { Skeleton } from "@workspace/ui/components/skeleton";

import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton active="Competencias">
      <Skeleton className="mb-10 h-20 w-full rounded-3xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-52 w-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </PageSkeleton>
  );
}
