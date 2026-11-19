"use client";

import * as React from "react";
import { ExternalLink, FileDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  BUDGET_LINE_CATEGORY_LABELS,
  BUDGET_RECEIPT_STATUS_LABELS,
  BUDGET_SPEND_STATUS_LABELS,
  BUDGET_STATUS_LABELS,
  formatMxnCents,
  parseMxnToCents,
  type BudgetLineCategory,
  type BudgetReceiptStatus,
} from "@workspace/db/budget-labels";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

import {
  loadBudgetCard,
  proposeBudgetSpendFromCard,
  saveBudgetActualsFromCard,
  saveBudgetPlanFromCard,
  type BudgetCardData,
} from "../../_actions/budget-actions";
import type { BudgetCardMode } from "../../_lib/budget-cards";
import type { BoardDetail } from "../../_lib/types";

type PlanLineDraft = {
  id?: number;
  kind: "expense" | "income";
  category: BudgetLineCategory;
  label: string;
  expected: string;
  notes: string;
  isSystem: boolean;
  spendStatus?: string;
};

type ActualLineDraft = {
  id: number;
  label: string;
  kind: "expense" | "income";
  isSystem: boolean;
  expectedCents: number;
  actual: string;
  receiptStatus: BudgetReceiptStatus;
  receiptMissingReason: string;
  spendStatus: string;
  notes: string;
};

function pesosInput(cents: number) {
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

export function CardBudgetSection({
  board,
  cardId,
  mode,
  readOnly,
}: {
  board: BoardDetail;
  cardId: number;
  mode: Exclude<BudgetCardMode, "sponsors">;
  readOnly?: boolean;
}) {
  const [data, setData] = React.useState<BudgetCardData | null>();
  const [fee, setFee] = React.useState("");
  const [competitors, setCompetitors] = React.useState("");
  const [planLines, setPlanLines] = React.useState<PlanLineDraft[]>([]);
  const [actualLines, setActualLines] = React.useState<ActualLineDraft[]>([]);
  const [revenue, setRevenue] = React.useState("");
  const [remanenteNote, setRemanenteNote] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const apply = React.useCallback((next: BudgetCardData | null) => {
    setData(next);
    if (!next) return;
    setFee(pesosInput(next.budget.proposedRegistrationFeeCents));
    setCompetitors(String(next.budget.expectedCompetitorCount));
    setRevenue(
      next.budget.registrationRevenueCents != null
        ? pesosInput(next.budget.registrationRevenueCents)
        : "",
    );
    setRemanenteNote(next.budget.remanenteNote ?? "");
    setPlanLines(
      next.lines.map((line) => ({
        id: line.id,
        kind: line.kind,
        category: line.category,
        label: line.label,
        expected: pesosInput(line.expectedCents),
        notes: line.notes ?? "",
        isSystem: line.isSystem,
        spendStatus: line.spendStatus,
      })),
    );
    setActualLines(
      next.lines.map((line) => ({
        id: line.id,
        label: line.label,
        kind: line.kind,
        isSystem: line.isSystem,
        expectedCents: line.expectedCents,
        actual:
          line.actualCents != null ? pesosInput(line.actualCents) : "",
        receiptStatus: line.receiptStatus,
        receiptMissingReason: line.receiptMissingReason ?? "",
        spendStatus: line.spendStatus,
        notes: line.notes ?? "",
      })),
    );
  }, []);

  React.useEffect(() => {
    if (!board.competition) return;
    let cancelled = false;
    loadBudgetCard({ boardId: board.id, cardId })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) apply(result.data);
        else {
          setData(null);
          toast.error(result.message);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          toast.error("No se pudo cargar el presupuesto");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apply, board.competition, board.id, cardId]);

  if (!board.competition) {
    return (
      <section className="space-y-2 border-t pt-4">
        <h3 className="text-sm font-semibold">Presupuesto</h3>
        <p className="text-muted-foreground text-sm">
          Este tablero no está ligado a una competencia.
        </p>
      </section>
    );
  }

  if (data === undefined) {
    return (
      <section className="space-y-2 border-t pt-4">
        <h3 className="text-sm font-semibold">Presupuesto</h3>
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="space-y-2 border-t pt-4">
        <h3 className="text-sm font-semibold">Presupuesto</h3>
        <p className="text-muted-foreground text-sm">
          No se pudo abrir el presupuesto.
        </p>
      </section>
    );
  }

  const canEditPlan =
    !readOnly &&
    (data.budget.status === "draft" || data.budget.status === "plan_submitted");
  const canEditActuals =
    !readOnly &&
    (data.budget.status === "plan_approved" ||
      data.budget.status === "mid_approved");

  function runPlan(submit: boolean) {
    const feeCents = parseMxnToCents(fee);
    const count = Number(competitors);
    if (feeCents == null || !Number.isInteger(count) || count < 0) {
      toast.error("Revisa la cuota y el número de competidores");
      return;
    }
    const lines: {
      id?: number;
      kind: "expense" | "income";
      category: BudgetLineCategory;
      label: string;
      expectedCents: number;
      notes?: string;
    }[] = [];
    for (const line of planLines) {
      const expectedCents = parseMxnToCents(line.expected);
      if (expectedCents == null) {
        toast.error(`Monto inválido en «${line.label}»`);
        return;
      }
      lines.push({
        id: line.id,
        kind: line.kind,
        category: line.category,
        label: line.label,
        expectedCents,
        notes: line.notes || undefined,
      });
    }
    startTransition(async () => {
      const result = await saveBudgetPlanFromCard({
        boardId: board.id,
        cardId,
        proposedRegistrationFeeCents: feeCents,
        expectedCompetitorCount: count,
        lines,
        submit,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      apply(result.data);
      toast.success(result.message);
    });
  }

  function runActuals(submit: boolean) {
    const revenueCents = parseMxnToCents(revenue);
    if (revenueCents == null) {
      toast.error("Revisa los ingresos de inscripción");
      return;
    }
    const lines: {
      id: number;
      actualCents: number;
      receiptStatus: BudgetReceiptStatus;
      receiptMissingReason?: string;
      notes?: string;
    }[] = [];
    for (const line of actualLines) {
      if (line.isSystem) continue;
      const actualCents = parseMxnToCents(line.actual || "0");
      if (actualCents == null) {
        toast.error(`Monto inválido en «${line.label}»`);
        return;
      }
      lines.push({
        id: line.id,
        actualCents,
        receiptStatus: line.receiptStatus,
        receiptMissingReason: line.receiptMissingReason || undefined,
        notes: line.notes || undefined,
      });
    }
    startTransition(async () => {
      const result = await saveBudgetActualsFromCard({
        boardId: board.id,
        cardId,
        registrationRevenueCents: revenueCents,
        remanenteNote: mode === "final" ? remanenteNote : undefined,
        lines,
        stage: mode === "final" ? "final" : "mid",
        submit,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      apply(result.data);
      toast.success(result.message);
    });
  }

  return (
    <section className="space-y-4 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Presupuesto</h3>
        <Badge variant="outline">
          {BUDGET_STATUS_LABELS[data.budget.status]}
        </Badge>
      </div>

      <div className="text-muted-foreground grid gap-1 text-xs sm:grid-cols-2">
        <p>
          Esperado: {formatMxnCents(data.summary.expectedIncomeCents)} −{" "}
          {formatMxnCents(data.summary.expectedExpenseCents)} ={" "}
          <span className="text-foreground font-medium">
            {formatMxnCents(data.summary.expectedNetCents)}
          </span>
        </p>
        <p>
          Real: {formatMxnCents(data.summary.actualIncomeCents)} −{" "}
          {formatMxnCents(data.summary.actualExpenseCents)} ={" "}
          <span className="text-foreground font-medium">
            {formatMxnCents(data.summary.actualNetCents)}
          </span>
        </p>
        {data.summary.breakEvenCompetitors != null ? (
          <p>
            Punto de equilibrio ≈ {data.summary.breakEvenCompetitors}{" "}
            competidores
          </p>
        ) : null}
      </div>

      {(data.budget.spreadsheetUrl || data.budget.receiptsDriveUrl) && (
        <div className="flex flex-wrap gap-2">
          {data.budget.spreadsheetUrl ? (
            <Button asChild variant="outline" size="sm">
              <a
                href={data.budget.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
              >
                Excel de respaldo
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          ) : null}
          {data.budget.receiptsDriveUrl ? (
            <Button asChild variant="outline" size="sm">
              <a
                href={data.budget.receiptsDriveUrl}
                target="_blank"
                rel="noreferrer"
              >
                Carpeta de comprobantes
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          ) : (
            <p className="text-muted-foreground text-xs">
              El delegado aún no pegó la carpeta de Drive de comprobantes.
            </p>
          )}
        </div>
      )}

      {mode === "plan" ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="budget-fee">Cuota de inscripción (MXN)</Label>
              <Input
                id="budget-fee"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                disabled={!canEditPlan || pending}
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="budget-count">Competidores esperados</Label>
              <Input
                id="budget-count"
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
                disabled={!canEditPlan || pending}
                inputMode="numeric"
              />
            </div>
          </div>

          <ul className="space-y-2">
            {planLines.map((line, index) => (
              <li
                key={line.id ?? `new-${index}`}
                className="bg-muted/40 space-y-2 rounded-md border p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {line.label ||
                      BUDGET_LINE_CATEGORY_LABELS[line.category]}
                    {line.isSystem ? (
                      <span className="text-muted-foreground ml-2 text-xs">
                        (automático)
                      </span>
                    ) : null}
                  </p>
                  {!line.isSystem && canEditPlan ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        setPlanLines((rows) =>
                          rows.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={line.expected}
                    onChange={(e) =>
                      setPlanLines((rows) =>
                        rows.map((row, i) =>
                          i === index
                            ? { ...row, expected: e.target.value }
                            : row,
                        ),
                      )
                    }
                    disabled={!canEditPlan || pending || line.isSystem}
                    inputMode="decimal"
                    aria-label="Monto esperado"
                  />
                  {!line.isSystem ? (
                    <Input
                      value={line.label}
                      onChange={(e) =>
                        setPlanLines((rows) =>
                          rows.map((row, i) =>
                            i === index
                              ? { ...row, label: e.target.value }
                              : row,
                          ),
                        )
                      }
                      disabled={!canEditPlan || pending}
                      placeholder="Etiqueta"
                    />
                  ) : (
                    <p className="text-muted-foreground self-center text-xs">
                      {BUDGET_LINE_CATEGORY_LABELS[line.category]}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {canEditPlan ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  setPlanLines((rows) => [
                    ...rows,
                    {
                      kind: "expense",
                      category: "otros",
                      label: "Otro gasto",
                      expected: "0",
                      notes: "",
                      isSystem: false,
                    },
                  ])
                }
              >
                <Plus className="size-4" />
                Gasto
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  setPlanLines((rows) => [
                    ...rows,
                    {
                      kind: "income",
                      category: "otros",
                      label: "Otro ingreso",
                      expected: "0",
                      notes: "",
                      isSystem: false,
                    },
                  ])
                }
              >
                <Plus className="size-4" />
                Ingreso
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => runPlan(false)}
              >
                Guardar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="brand"
                disabled={pending}
                onClick={() => runPlan(true)}
              >
                Enviar al delegado
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="budget-revenue">
              Ingresos de inscripción recaudados (MXN)
            </Label>
            <Input
              id="budget-revenue"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              disabled={!canEditActuals || pending}
              inputMode="decimal"
            />
          </div>

          <ul className="space-y-2">
            {actualLines.map((line) => (
              <li
                key={line.id}
                className="bg-muted/40 space-y-2 rounded-md border p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{line.label}</p>
                    <p className="text-muted-foreground text-xs">
                      Esperado {formatMxnCents(line.expectedCents)}
                      {line.kind === "expense" ? (
                        <>
                          {" "}
                          ·{" "}
                          {
                            BUDGET_SPEND_STATUS_LABELS[
                              line.spendStatus as keyof typeof BUDGET_SPEND_STATUS_LABELS
                            ]
                          }
                        </>
                      ) : null}
                    </p>
                  </div>
                  {line.kind === "expense" &&
                  !line.isSystem &&
                  canEditActuals &&
                  line.spendStatus !== "approved" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending || line.spendStatus === "proposed"}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await proposeBudgetSpendFromCard({
                            boardId: board.id,
                            cardId,
                            lineId: line.id,
                          });
                          if (!result.ok) {
                            toast.error(result.message);
                            return;
                          }
                          apply(result.data);
                          toast.success(result.message);
                        });
                      }}
                    >
                      Pedir aprobación
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={line.actual}
                    onChange={(e) =>
                      setActualLines((rows) =>
                        rows.map((row) =>
                          row.id === line.id
                            ? { ...row, actual: e.target.value }
                            : row,
                        ),
                      )
                    }
                    disabled={!canEditActuals || pending || line.isSystem}
                    inputMode="decimal"
                    aria-label="Monto real"
                  />
                  {line.kind === "expense" && !line.isSystem ? (
                    <select
                      className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                      value={line.receiptStatus}
                      disabled={!canEditActuals || pending}
                      onChange={(e) =>
                        setActualLines((rows) =>
                          rows.map((row) =>
                            row.id === line.id
                              ? {
                                  ...row,
                                  receiptStatus: e.target
                                    .value as BudgetReceiptStatus,
                                }
                              : row,
                          ),
                        )
                      }
                    >
                      {(
                        Object.keys(
                          BUDGET_RECEIPT_STATUS_LABELS,
                        ) as BudgetReceiptStatus[]
                      ).map((status) => (
                        <option key={status} value={status}>
                          {BUDGET_RECEIPT_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-muted-foreground self-center text-xs">
                      {line.isSystem ? "Calculado automáticamente" : "Ingreso"}
                    </p>
                  )}
                </div>
                {line.receiptStatus === "missing_reason" ? (
                  <Input
                    value={line.receiptMissingReason}
                    onChange={(e) =>
                      setActualLines((rows) =>
                        rows.map((row) =>
                          row.id === line.id
                            ? {
                                ...row,
                                receiptMissingReason: e.target.value,
                              }
                            : row,
                        ),
                      )
                    }
                    disabled={!canEditActuals || pending}
                    placeholder="Motivo sin comprobante"
                  />
                ) : null}
              </li>
            ))}
          </ul>

          {mode === "final" ? (
            <div className="space-y-1">
              <Label htmlFor="budget-remanente">Uso deseado del remanente</Label>
              <Textarea
                id="budget-remanente"
                value={remanenteNote}
                onChange={(e) => setRemanenteNote(e.target.value)}
                disabled={!canEditActuals || pending}
                rows={3}
              />
            </div>
          ) : null}

          {canEditActuals ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => runActuals(false)}
              >
                Guardar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="brand"
                disabled={pending}
                onClick={() => runActuals(true)}
              >
                {mode === "final"
                  ? "Enviar informe final"
                  : "Enviar primer avance"}
              </Button>
            </div>
          ) : null}

          {data.budget.status === "closed" ? (
            <Button asChild variant="outline" size="sm">
              <a
                href={`/boards/${board.id}/costos/resumen`}
                target="_blank"
                rel="noreferrer"
              >
                <FileDown className="size-4" />
                Descargar resumen PDF
              </a>
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}
