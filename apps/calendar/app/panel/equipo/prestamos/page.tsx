import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Button } from "@workspace/ui/components/button";

import { LoansTable } from "../_components/loans-table";
import { getLoans } from "../_lib/queries";
import Loading from "../loading";

async function PageContent() {
  await connection();
  const loans = await getLoans();
  const open = loans.filter((loan) => loan.status !== "returned");
  const returned = loans.filter((loan) => loan.status === "returned");
  const overdue = open.filter((loan) => loan.status === "overdue").length;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Equipo prestado
          {overdue > 0 ? (
            <span className="ml-2 text-sm font-normal text-red-700">
              {overdue} vencido(s)
            </span>
          ) : null}
        </h2>
        <LoansTable loans={open} empty="No hay equipo prestado ahora." />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Devueltos</h2>
        <LoansTable loans={returned} empty="Aún no hay préstamos devueltos." />
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Préstamos</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Custodios de equipo prestado: quién lo tiene, desde cuándo y para
            qué.
          </p>
        </div>
        <Button asChild>
          <Link href="/panel/equipo/prestamos/nuevo">Nuevo préstamo</Link>
        </Button>
      </div>
      <Suspense fallback={<Loading />}>
        <PageContent />
      </Suspense>
    </div>
  );
}
