import type { Route } from "next";
import Link from "next/link";
import { ExternalLink, PiggyBank } from "lucide-react";

import { getCompetitionBudgetSheet } from "@workspace/db/budget";
import {
  BUDGET_STATUS_LABELS,
  formatMxnCents,
  type BudgetStatus,
} from "@workspace/db/budget-labels";
import { db } from "@workspace/db";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

const STATUS_BADGE: Record<BudgetStatus, string> = {
  draft: "bg-zinc-100 text-zinc-700 border-zinc-200",
  plan_submitted: "bg-amber-100 text-amber-900 border-amber-200",
  plan_approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  mid_submitted: "bg-amber-100 text-amber-900 border-amber-200",
  mid_approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  final_submitted: "bg-amber-100 text-amber-900 border-amber-200",
  closed: "bg-sky-100 text-sky-900 border-sky-200",
};

export async function CompetitionBudgetSection({
  competitionId,
}: {
  competitionId: number;
}) {
  const sheet = await getCompetitionBudgetSheet(db, competitionId);
  const pendingSpends =
    sheet?.lines.filter(
      (line) => line.kind === "expense" && line.spendStatus === "proposed",
    ).length ?? 0;

  return (
    <section className="bg-card space-y-4 rounded-lg border p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <PiggyBank className="size-4" />
            Costos
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Presupuesto en el tablero; comprobantes en Drive. El Excel queda
            como respaldo.
          </p>
        </div>
        {sheet ? (
          <Badge
            variant="outline"
            className={cn(STATUS_BADGE[sheet.budget.status])}
          >
            {BUDGET_STATUS_LABELS[sheet.budget.status]}
          </Badge>
        ) : (
          <Badge variant="outline">Sin presupuesto</Badge>
        )}
      </div>

      {sheet ? (
        <div className="space-y-1 text-sm">
          <p>
            Neto esperado{" "}
            <span className="font-medium">
              {formatMxnCents(sheet.summary.expectedNetCents)}
            </span>
            {" · "}
            Neto real{" "}
            <span className="font-medium">
              {formatMxnCents(sheet.summary.actualNetCents)}
            </span>
          </p>
          {pendingSpends > 0 ? (
            <p className="text-amber-800 text-xs">
              {pendingSpends} gasto(s) pendiente(s) de aprobación
            </p>
          ) : null}
          {sheet.budget.receiptsDriveUrl ? (
            <a
              href={sheet.budget.receiptsDriveUrl}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:underline"
            >
              Carpeta de comprobantes
              <ExternalLink className="size-3" />
            </a>
          ) : (
            <p className="text-muted-foreground text-xs">
              Falta pegar la carpeta de Drive de comprobantes.
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Los organizadores aún no han abierto el presupuesto en el tablero.
        </p>
      )}

      <Button asChild size="sm">
        <Link
          prefetch={false}
          href={`/panel/competencias/${competitionId}/costos` as Route}
        >
          Revisar costos
        </Link>
      </Button>
    </section>
  );
}
