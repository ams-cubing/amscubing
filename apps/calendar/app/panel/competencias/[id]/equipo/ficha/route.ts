import { db } from "@workspace/db";
import { getCompetitionEquipmentSheet } from "@workspace/db/equipment";
import { log } from "@workspace/server/log";
import {
  createEquipmentSheetPdf,
  equipmentSheetResponse,
} from "@workspace/server/pdf/equipment-sheet";

import { requireDelegate } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // The panel layout guard doesn't run for route handlers.
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return new Response(authResult.message, { status: 403 });
  }

  const competitionId = Number((await params).id);
  if (!Number.isInteger(competitionId) || competitionId <= 0) {
    return new Response("Competencia no encontrada", { status: 404 });
  }
  const sheet = await getCompetitionEquipmentSheet(db, competitionId);
  if (!sheet) {
    return new Response("Competencia no encontrada", { status: 404 });
  }

  try {
    const bytes = await createEquipmentSheetPdf(sheet);
    return equipmentSheetResponse(bytes, sheet);
  } catch (error) {
    log.error("calendar.equipment_sheet_failed", { competitionId, error });
    return new Response("No se pudo generar la ficha", { status: 500 });
  }
}
