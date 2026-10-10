import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-5xl flex-1 space-y-10 p-6"
      aria-busy="true"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <section className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
