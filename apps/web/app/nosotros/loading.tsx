import { Skeleton } from "@workspace/ui/components/skeleton";

import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton active="Nosotros">
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
      <Skeleton className="mt-14 mb-6 h-10 w-72" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-3xl" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ))}
      </div>
    </PageSkeleton>
  );
}
