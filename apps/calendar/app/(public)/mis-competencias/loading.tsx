import { Skeleton } from "@workspace/ui/components/skeleton";

import { PublicPageShell } from "../_components/public-page-shell";

export default function Loading() {
  return (
    <PublicPageShell
      title="Tus competencias"
      description="Solicitudes de fecha y competencias que organizas o delegas."
      width="medium"
    >
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-3xl border border-black/10 p-5 md:p-6 space-y-3"
          >
            <div>
              <Skeleton className="h-6 md:h-7 w-3/4" />
              <Skeleton className="h-4 w-2/3 mt-1" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </div>
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-4/5 rounded-md" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-6 w-28 rounded-md" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </PublicPageShell>
  );
}
