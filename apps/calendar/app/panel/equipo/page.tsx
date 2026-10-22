import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@workspace/ui/components/button";

import { requireDelegate } from "@/lib/session";

import { ItemsTable } from "./_components/items-table";
import { SummaryTable } from "./_components/summary-table";
import { getGuardians, getInventoryOverview } from "./_lib/queries";
import Loading from "./loading";

type SearchParams = Promise<{ guardian?: string }>;

async function PageContent({ searchParams }: { searchParams: SearchParams }) {
  const [params, session, { summary, items }, guardians] = await Promise.all([
    searchParams,
    requireDelegate(),
    getInventoryOverview(),
    getGuardians(),
  ]);
  const initialGuardianId = params.guardian || null;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Resumen</h2>
        <SummaryTable rows={summary} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Unidades</h2>
        <ItemsTable
          key={initialGuardianId ?? ""}
          items={items}
          guardians={guardians}
          initialGuardianId={initialGuardianId}
          currentUserId={session.ok ? session.session.user.id : null}
        />
      </section>
    </div>
  );
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            Equipo de competencia
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Timers, displays y accesorios de AMS, quién los resguarda y en qué
            estado están.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/panel/equipo/adquisiciones">
              Registrar adquisición
            </Link>
          </Button>
          <Button asChild>
            <Link href="/panel/equipo/prestamos/nuevo">Nuevo préstamo</Link>
          </Button>
        </div>
      </div>
      <Suspense fallback={<Loading />}>
        <PageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
