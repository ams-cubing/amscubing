import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <div>
          <Skeleton className="h-8 md:h-9 w-72" />
          <Skeleton className="h-4 md:h-5 w-96 mt-2" />
        </div>

        <section className="bg-card border rounded-lg p-4 md:p-6 shadow-sm">
          <div className="flex justify-center">
            <Skeleton className="w-full max-w-184 h-122.75 rounded-lg" />
          </div>
        </section>

        <section className="bg-card border rounded-lg p-4 md:p-6 shadow-sm">
          <Skeleton className="h-6 md:h-7 w-80 mb-4" />
          <div className="space-y-3">
            <div className="flex gap-4 pb-3 border-b">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-center py-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-52" />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card border rounded-lg p-4 md:p-6 shadow-sm">
          <Skeleton className="h-6 md:h-7 w-72 mb-4" />
          <div className="space-y-3">
            <div className="flex gap-4 pb-3 border-b">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex gap-4 py-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
