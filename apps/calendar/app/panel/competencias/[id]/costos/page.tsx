import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileDown } from "lucide-react";

import { db } from "@workspace/db";
import { ensureCompetitionBudget } from "@workspace/db/budget";
import {
  BUDGET_LINE_KIND_LABELS,
  BUDGET_RECEIPT_STATUS_LABELS,
  BUDGET_SPEND_STATUS_LABELS,
  BUDGET_STATUS_LABELS,
  formatMxnCents,
} from "@workspace/db/budget-labels";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ActionForm } from "@workspace/ui/components/action-form";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

import { requireDelegate } from "@/lib/session";

import {
  decideBudgetSpendAction,
  decideBudgetStageAction,
  setBudgetDriveUrlsAction,
} from "../_actions/budget-actions";
import { getCompetitionWithRelations } from "../_lib/queries";

type Params = Promise<{ id: string }>;

export default async function CompetitionBudgetPage({
  params,
}: {
  params: Params;
}) {
  const auth = await requireDelegate();
  if (!auth.ok) {
    notFound();
  }

  const { id } = await params;
  const competitionId = Number(id);
  if (!Number.isInteger(competitionId) || competitionId <= 0) {
    notFound();
  }

  const competition = await getCompetitionWithRelations(competitionId);
  if (!competition) notFound();

  const sheet = await ensureCompetitionBudget(db, competitionId);
  const pendingSpends = sheet.lines.filter(
    (line) => line.kind === "expense" && line.spendStatus === "proposed",
  );

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6 md:space-y-8">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link
              prefetch={false}
              href={`/panel/competencias/${competitionId}` as Route}
            >
              <ArrowLeft className="size-4" />
              Volver a la competencia
            </Link>
          </Button>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold md:text-2xl">
                Costos —{" "}
                {competition.name?.trim() || competition.city}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Aprueba el presupuesto, gastos y entregas. Los comprobantes
                viven en Drive.
              </p>
            </div>
            <Badge variant="outline">
              {BUDGET_STATUS_LABELS[sheet.budget.status]}
            </Badge>
          </div>
        </div>

        <section className="bg-card space-y-4 rounded-lg border p-4 shadow-sm md:p-5">
          <h2 className="font-semibold">Enlaces de Drive</h2>
          <ActionForm
            action={setBudgetDriveUrlsAction}
            className="space-y-3"
          >
            <input type="hidden" name="competitionId" value={competitionId} />
            <div className="space-y-1">
              <Label htmlFor="receiptsDriveUrl">
                Carpeta de comprobantes (obligatoria para aprobar el plan)
              </Label>
              <Input
                id="receiptsDriveUrl"
                name="receiptsDriveUrl"
                defaultValue={sheet.budget.receiptsDriveUrl ?? ""}
                placeholder="https://drive.google.com/..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="spreadsheetUrl">
                Excel de costos (respaldo, opcional)
              </Label>
              <Input
                id="spreadsheetUrl"
                name="spreadsheetUrl"
                defaultValue={sheet.budget.spreadsheetUrl ?? ""}
                placeholder="https://docs.google.com/spreadsheets/..."
              />
            </div>
            <Button type="submit" size="sm">
              Guardar enlaces
            </Button>
          </ActionForm>
          <div className="flex flex-wrap gap-2">
            {sheet.budget.receiptsDriveUrl ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={sheet.budget.receiptsDriveUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir comprobantes
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            ) : null}
            {sheet.budget.spreadsheetUrl ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={sheet.budget.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir Excel
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            ) : null}
            {sheet.budget.status === "closed" ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`/panel/competencias/${competitionId}/costos/resumen`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileDown className="size-4" />
                  Descargar resumen PDF
                </a>
              </Button>
            ) : null}
          </div>
        </section>

        <section className="bg-card space-y-3 rounded-lg border p-4 shadow-sm md:p-5">
          <h2 className="font-semibold">Resumen</h2>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              Cuota propuesta:{" "}
              {formatMxnCents(sheet.budget.proposedRegistrationFeeCents)}
            </p>
            <p>Competidores esperados: {sheet.budget.expectedCompetitorCount}</p>
            <p>
              Ingresos inscripción:{" "}
              {sheet.budget.registrationRevenueCents != null
                ? formatMxnCents(sheet.budget.registrationRevenueCents)
                : "—"}
            </p>
            <p>
              Neto esperado: {formatMxnCents(sheet.summary.expectedNetCents)}
            </p>
            <p>Neto real: {formatMxnCents(sheet.summary.actualNetCents)}</p>
            {sheet.budget.remanenteNote ? (
              <p className="sm:col-span-2">
                Remanente (organizadores): {sheet.budget.remanenteNote}
              </p>
            ) : null}
          </div>
        </section>

        {pendingSpends.length > 0 ? (
          <section className="bg-card space-y-3 rounded-lg border p-4 shadow-sm md:p-5">
            <h2 className="font-semibold">Gastos por aprobar</h2>
            <ul className="space-y-3">
              {pendingSpends.map((line) => (
                <li
                  key={line.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{line.label}</p>
                    <p className="text-muted-foreground text-xs">
                      Esperado {formatMxnCents(line.expectedCents)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <ActionForm action={decideBudgetSpendAction}>
                      <input
                        type="hidden"
                        name="competitionId"
                        value={competitionId}
                      />
                      <input type="hidden" name="lineId" value={line.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <Button type="submit" size="sm">
                        Aprobar
                      </Button>
                    </ActionForm>
                    <ActionForm action={decideBudgetSpendAction}>
                      <input
                        type="hidden"
                        name="competitionId"
                        value={competitionId}
                      />
                      <input type="hidden" name="lineId" value={line.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <Button type="submit" size="sm" variant="outline">
                        Rechazar
                      </Button>
                    </ActionForm>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="bg-card space-y-3 rounded-lg border p-4 shadow-sm md:p-5">
          <h2 className="font-semibold">Renglones</h2>
          <ul className="divide-y rounded-lg border text-sm">
            {sheet.lines.map((line) => (
              <li
                key={line.id}
                className="flex flex-wrap items-start justify-between gap-2 px-3 py-2"
              >
                <div>
                  <p className="font-medium">
                    {line.label}{" "}
                    <span className="text-muted-foreground font-normal">
                      ({BUDGET_LINE_KIND_LABELS[line.kind]})
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Esperado {formatMxnCents(line.expectedCents)}
                    {line.actualCents != null
                      ? ` · Real ${formatMxnCents(line.actualCents)}`
                      : null}
                    {line.kind === "expense"
                      ? ` · ${BUDGET_SPEND_STATUS_LABELS[line.spendStatus]} · ${BUDGET_RECEIPT_STATUS_LABELS[line.receiptStatus]}`
                      : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card space-y-4 rounded-lg border p-4 shadow-sm md:p-5">
          <h2 className="font-semibold">Decisiones de etapa</h2>

          {sheet.budget.status === "plan_submitted" ? (
            <div className="flex flex-wrap gap-2">
              <ActionForm action={decideBudgetStageAction}>
                <input
                  type="hidden"
                  name="competitionId"
                  value={competitionId}
                />
                <input type="hidden" name="stage" value="plan" />
                <input type="hidden" name="decision" value="approved" />
                <Button type="submit" size="sm">
                  Aprobar presupuesto
                </Button>
              </ActionForm>
              <ActionForm action={decideBudgetStageAction}>
                <input
                  type="hidden"
                  name="competitionId"
                  value={competitionId}
                />
                <input type="hidden" name="stage" value="plan" />
                <input type="hidden" name="decision" value="rejected" />
                <Button type="submit" size="sm" variant="outline">
                  Devolver
                </Button>
              </ActionForm>
            </div>
          ) : null}

          {sheet.budget.status === "mid_submitted" ? (
            <div className="flex flex-wrap gap-2">
              <ActionForm action={decideBudgetStageAction}>
                <input
                  type="hidden"
                  name="competitionId"
                  value={competitionId}
                />
                <input type="hidden" name="stage" value="mid" />
                <input type="hidden" name="decision" value="approved" />
                <Button type="submit" size="sm">
                  Aprobar primer avance
                </Button>
              </ActionForm>
              <ActionForm action={decideBudgetStageAction}>
                <input
                  type="hidden"
                  name="competitionId"
                  value={competitionId}
                />
                <input type="hidden" name="stage" value="mid" />
                <input type="hidden" name="decision" value="rejected" />
                <Button type="submit" size="sm" variant="outline">
                  Devolver
                </Button>
              </ActionForm>
            </div>
          ) : null}

          {sheet.budget.status === "final_submitted" ? (
            <ActionForm
              action={decideBudgetStageAction}
              className="space-y-3"
            >
              <input type="hidden" name="competitionId" value={competitionId} />
              <input type="hidden" name="stage" value="final" />
              <div className="space-y-1">
                <Label htmlFor="remanenteDecision">
                  Decisión sobre el remanente (opcional)
                </Label>
                <Textarea
                  id="remanenteDecision"
                  name="remanenteDecision"
                  defaultValue={sheet.budget.remanenteDecision ?? ""}
                  rows={3}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  name="decision"
                  value="approved"
                  size="sm"
                >
                  Cerrar informe final
                </Button>
                <Button
                  type="submit"
                  name="decision"
                  value="rejected"
                  size="sm"
                  variant="outline"
                >
                  Devolver
                </Button>
              </div>
            </ActionForm>
          ) : null}

          {sheet.budget.status !== "plan_submitted" &&
          sheet.budget.status !== "mid_submitted" &&
          sheet.budget.status !== "final_submitted" ? (
            <p className="text-muted-foreground text-sm">
              No hay etapas pendientes de tu lado ahora.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
