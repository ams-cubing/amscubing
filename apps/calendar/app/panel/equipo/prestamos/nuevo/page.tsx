import { Suspense } from "react";
import { todayInMexico } from "@workspace/db/equipment";

import { requireDelegate } from "@/lib/session";

import { LoanForm, type LoanPrefill } from "../../_components/loan-form";
import {
  getLendableInventory,
  getLoanCompetitionOptions,
  getRequestForLoan,
} from "../../_lib/queries";
import Loading from "../../loading";

type SearchParams = Promise<{ solicitud?: string }>;

async function loadPrefill(raw: string | undefined) {
  const requestId = Number(raw);
  if (!Number.isInteger(requestId) || requestId <= 0) return undefined;
  const found = await getRequestForLoan(requestId);
  if (!found || found.request.status === "cancelled") return undefined;
  const { request, sheet } = found;
  const label = sheet.competition.name?.trim() || sheet.competition.city;
  const prefill: LoanPrefill = {
    requestId: request.id,
    competitionId: sheet.competition.id,
    competitionLabel: label,
    borrower: sheet.primaryOrganizer,
    reason: `Competencia ${label}`,
    summary: request.summary,
    notes: request.notes,
    quantities: Object.fromEntries(
      request.lines.map((line) => [line.typeId, line.quantity]),
    ),
  };
  return { prefill, competition: sheet.competition };
}

async function PageContent({ searchParams }: { searchParams: SearchParams }) {
  const [session, { solicitud }] = await Promise.all([
    requireDelegate(),
    searchParams,
  ]);
  const today = todayInMexico();
  const [inventory, competitions, fromRequest] = await Promise.all([
    getLendableInventory(),
    getLoanCompetitionOptions(today),
    loadPrefill(solicitud),
  ]);

  const options =
    fromRequest &&
    !competitions.some((c) => c.id === fromRequest.competition.id)
      ? [fromRequest.competition, ...competitions]
      : competitions;

  return (
    <LoanForm
      types={inventory.types}
      items={inventory.items}
      stock={inventory.stock}
      guardians={inventory.guardians}
      competitions={options}
      defaultLenderId={session.ok ? session.session.user.id : null}
      today={today}
      prefill={fromRequest?.prefill}
    />
  );
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Nuevo préstamo</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          El equipo sale del inventario del guardián que presta y quien lo
          recibe recibe una notificación.
        </p>
      </div>
      <Suspense fallback={<Loading />}>
        <PageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
