import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <section className="shell section" aria-busy="true">
      <Skeleton className="h-4 w-48" />
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Skeleton className="h-12 w-full max-w-xl" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
          <div className="mt-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    </section>
  );
}
