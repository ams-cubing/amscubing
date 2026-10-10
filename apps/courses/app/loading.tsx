import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <section className="shell section" aria-busy="true">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-12 w-full max-w-xl" />
      <Skeleton className="mt-3 h-5 w-full max-w-lg" />
      <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-video w-full rounded-2xl" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
