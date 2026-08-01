import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
        <div>
          <Skeleton className="h-8 md:h-9 w-80" />
          <Skeleton className="h-4 md:h-5 w-full max-w-2xl mt-2" />
        </div>

        <section className="bg-card border rounded-lg p-5 md:p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </section>

        <section className="bg-card border rounded-lg p-5 md:p-6 shadow-sm">
          <Skeleton className="h-6 md:h-7 w-64 mb-3" />
          <Skeleton className="h-4 w-full max-w-md mb-4" />

          <div className="grid gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3"
              >
                <Skeleton className="h-5 w-48 mb-1.5" />
                <Skeleton className="h-4 w-56" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
