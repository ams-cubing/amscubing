import { Skeleton } from "@workspace/ui/components/skeleton";

import { PublicPageShell } from "../_components/public-page-shell";

export default function Loading() {
  return (
    <PublicPageShell
      title="Solicitar fecha"
      description="Completa el formulario para solicitar una fecha para tu competencia. Se propondrá un delegado según la ubicación; la asignación queda pendiente de su confirmación."
      width="narrow"
    >
      <section className="rounded-3xl border border-black/10 p-5 md:p-6 space-y-5">
        {["w-32", "w-40", "w-36", "w-28"].map((width) => (
          <div key={width} className="space-y-2">
            <Skeleton className={`h-4 ${width}`} />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </section>

      <section className="rounded-3xl bg-ams-soft p-5 md:p-6">
        <Skeleton className="h-6 md:h-7 w-64 mb-3" />
        <Skeleton className="h-4 w-full max-w-md mb-4" />
        <div className="grid gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-white px-4 py-3">
              <Skeleton className="h-5 w-48 mb-1.5" />
              <Skeleton className="h-4 w-56" />
            </div>
          ))}
        </div>
      </section>
    </PublicPageShell>
  );
}
