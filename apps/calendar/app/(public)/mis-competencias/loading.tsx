import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        <div>
          <Skeleton className="h-8 md:h-9 w-64" />
          <Skeleton className="h-4 md:h-5 w-96 mt-2" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border rounded-lg p-4 md:p-5 shadow-sm space-y-3"
            >
              <div>
                <Skeleton className="h-6 md:h-7 w-3/4" />
                <Skeleton className="h-4 w-2/3 mt-1" />
                <Skeleton className="h-4 w-1/2 mt-1" />
              </div>

              <div className="bg-muted/50 rounded-md p-2.5">
                <Skeleton className="h-4 w-full" />
              </div>

              <div className="bg-muted/50 rounded-md p-2.5">
                <Skeleton className="h-4 w-4/5" />
              </div>

              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-6 w-28 rounded-md" />
              </div>

              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
