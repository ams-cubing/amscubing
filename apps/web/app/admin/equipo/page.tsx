import type { Route } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Button } from "@workspace/ui/components/button";

import { requireDelegate } from "@/lib/session";

import { SummaryTable } from "./_components/summary-table";
import { getInventoryOverview } from "./_lib/queries";
import Loading from "./loading";

async function PageContent() {
  await connection();
  const [, { summary }] = await Promise.all([
    requireDelegate(),
    getInventoryOverview(),
  ]);

  return <SummaryTable rows={summary} />;
}

export default function Page() {
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
            <Link href={"/admin/equipo/adquisiciones" as Route}>
              Registrar adquisición
            </Link>
          </Button>
          <Button asChild>
            <Link href={"/admin/equipo/prestamos/nuevo" as Route}>
              Nuevo préstamo
            </Link>
          </Button>
        </div>
      </div>
      <Suspense fallback={<Loading />}>
        <PageContent />
      </Suspense>
    </div>
  );
}
