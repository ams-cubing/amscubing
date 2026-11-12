import { Skeleton } from "@workspace/ui/components/skeleton";

export function LoginFormSkeleton() {
  return (
    <div className="rounded-3xl bg-ams-soft p-8" aria-busy="true">
      <span className="sr-only">Cargando acceso…</span>
      <div aria-hidden>
        <Skeleton className="h-14 w-full bg-ams-navy/15" />
        <div className="my-7 flex items-center gap-4">
          <span className="h-px flex-1 bg-ams-navy/15" />
          <Skeleton className="h-4 w-28 bg-ams-navy/10" />
          <span className="h-px flex-1 bg-ams-navy/15" />
        </div>
        <div className="mb-7 flex gap-3">
          <Skeleton className="h-11 w-36 bg-ams-navy/15" />
          <Skeleton className="h-11 w-32 bg-white" />
        </div>
        <Skeleton className="h-6 w-48 bg-ams-navy/15" />
        <div className="mt-6 space-y-5">
          {[1, 2].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-32 bg-ams-navy/10" />
              <Skeleton className="mt-2 h-12 w-full bg-white" />
            </div>
          ))}
          <Skeleton className="h-14 w-full bg-ams-red/20" />
        </div>
        <Skeleton className="mt-6 h-4 w-full bg-ams-navy/10" />
        <Skeleton className="mt-2 h-4 w-2/3 bg-ams-navy/10" />
      </div>
    </div>
  );
}
