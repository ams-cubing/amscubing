import { Skeleton } from "@workspace/ui/components/skeleton";
import { ResetForm } from "./reset-form";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Suspense } from "react";

type SearchParams = Promise<{ token?: string }>;

export default function Page(props: { searchParams: SearchParams }) {
  return (
    <main>
      <SiteNav />
      <section className="ams-container max-w-xl py-20">
        <h1 className="ams-display text-4xl text-ams-navy">
          Restablecer contraseña
        </h1>
        <Suspense fallback={<ResetFormSkeleton />}>
          <ResetContent {...props} />
        </Suspense>
      </section>
      <SiteFooter />
    </main>
  );
}

async function ResetContent({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  return <ResetForm token={token ?? ""} />;
}

function ResetFormSkeleton() {
  return (
    <div className="mt-8" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      <div className="space-y-5" aria-hidden>
        {[1, 2].map((i) => (
          <div key={i}>
            <Skeleton className="h-4 w-44 bg-ams-navy/10" />
            <Skeleton className="mt-2 h-12 w-full bg-ams-navy/10" />
          </div>
        ))}
        <Skeleton className="mt-6 h-14 w-48 bg-ams-red/20" />
      </div>
    </div>
  );
}
