import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-5 w-72" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </main>
  );
}
