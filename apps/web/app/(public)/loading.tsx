import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <section className="bg-card border rounded-lg p-4 md:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full sm:w-64" />
          </div>
        </section>

        <section className="bg-card border rounded-lg p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>

            {[1, 2, 3, 4, 5].map((week) => (
              <div key={week} className="grid grid-cols-7 gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <Skeleton
                    key={`${week}-${day}`}
                    className="h-20 md:h-24 w-full"
                  />
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card border rounded-lg p-4 md:p-5 shadow-sm">
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
