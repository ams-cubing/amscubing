import { db } from "@workspace/db";
import { getCompetitionBudgetSheet } from "@workspace/db/budget";
import { log } from "@workspace/server/log";
import {
  budgetSummaryResponse,
  createBudgetSummaryPdf,
} from "@workspace/server/pdf/budget-summary";

import { requireDelegate } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireDelegate();
  if (!auth.ok) {
    return new Response("No autenticado", { status: 401 });
  }

  const competitionId = Number((await params).id);
  if (!Number.isInteger(competitionId) || competitionId <= 0) {
    return new Response("Competencia no encontrada", { status: 404 });
  }

  const sheet = await getCompetitionBudgetSheet(db, competitionId);
  if (!sheet) {
    return new Response("Aún no hay presupuesto", { status: 404 });
  }
  if (sheet.budget.status !== "closed") {
    return new Response("El informe final aún no está cerrado", {
      status: 409,
    });
  }

  try {
    const bytes = await createBudgetSummaryPdf(sheet);
    return budgetSummaryResponse(bytes, sheet);
  } catch (error) {
    log.error("calendar.budget_summary_failed", { competitionId, error });
    return new Response("No se pudo generar el resumen", { status: 500 });
  }
}
