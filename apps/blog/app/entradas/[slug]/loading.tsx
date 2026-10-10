import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <article className="section shell max-w-3xl" aria-busy="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-12 w-full" />
      <Skeleton className="mt-2 h-12 w-2/3" />
      <Skeleton className="mt-8 aspect-video w-full rounded-2xl" />
      <div className="mt-8 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
        <Skeleton className="h-4 w-1/2" />
      </div>
    </article>
  );
}
