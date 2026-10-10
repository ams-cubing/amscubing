import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      aria-busy="true"
    >
      <div className="shrink-0 border-b px-4 py-3">
        <div className="mx-auto flex w-full max-w-400 items-center justify-between gap-3">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {[1, 2, 3, 4].map((column) => (
          <div key={column} className="w-72 shrink-0 space-y-3">
            <Skeleton className="h-6 w-32" />
            {[1, 2, 3].map((card) => (
              <Skeleton key={card} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
