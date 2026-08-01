import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <main className="p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-32 w-full" />
          </div>

          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </main>
  );
}
