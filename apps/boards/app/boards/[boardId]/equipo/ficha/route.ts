import { eq } from "drizzle-orm";

import { db } from "@workspace/db";
import { getCompetitionEquipmentSheet } from "@workspace/db/equipment";
import { boards } from "@workspace/db/schema";
import { log } from "@workspace/server/log";
import {
  createEquipmentSheetPdf,
  equipmentSheetResponse,
} from "@workspace/server/pdf/equipment-sheet";

import { canAccessBoard } from "@/lib/boards";
import { requireSession } from "@/lib/session";

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

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { competitionId: true },
  });
  const sheet = board?.competitionId
    ? await getCompetitionEquipmentSheet(db, board.competitionId)
    : null;
  if (!sheet) {
    return new Response("Este tablero no está ligado a una competencia", {
      status: 404,
    });
  }
  if (!sheet.confirmation) {
    return new Response("El delegado aún no confirma el equipo", {
      status: 409,
    });
  }

  try {
    const bytes = await createEquipmentSheetPdf(sheet);
    return equipmentSheetResponse(bytes, sheet);
  } catch (error) {
    log.error("boards.equipment_sheet_failed", { boardId, error });
    return new Response("No se pudo generar la ficha", { status: 500 });
  }
}
