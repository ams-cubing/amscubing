import { eq } from "drizzle-orm";

import { db } from "@workspace/db";
import { getCompetitionBudgetSheet } from "@workspace/db/budget";
import { boards } from "@workspace/db/schema";
import { log } from "@workspace/server/log";
import {
  budgetSummaryResponse,
  createBudgetSummaryPdf,
} from "@workspace/server/pdf/budget-summary";

import { canAccessBoard } from "@/lib/boards";
import { requireSession } from "@/lib/session";

import {
  BOARDS_TOOLS_DENIED_MESSAGE,
  sessionHasBoardsToolsBeta,
} from "../../_lib/boards-tools-beta";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const authResult = await requireSession();
  if (!authResult.ok) {
    return new Response("No autenticado", { status: 401 });
  }

  const boardId = Number((await params).boardId);
  if (!Number.isInteger(boardId) || boardId <= 0) {
    return new Response("Tablero no encontrado", { status: 404 });
  }
  if (!(await canAccessBoard(authResult.session.user, boardId))) {
    return new Response("No tienes acceso a este tablero", { status: 403 });
  }
  if (!(await sessionHasBoardsToolsBeta(authResult.session.user))) {
    return new Response(BOARDS_TOOLS_DENIED_MESSAGE, { status: 403 });
  }

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { competitionId: true },
  });
  const sheet = board?.competitionId
    ? await getCompetitionBudgetSheet(db, board.competitionId)
    : null;
  if (!sheet) {
    return new Response("Este tablero no está ligado a una competencia", {
      status: 404,
    });
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
    log.error("boards.budget_summary_failed", { boardId, error });
    return new Response("No se pudo generar el resumen", { status: 500 });
  }
}
