import { eq } from "drizzle-orm";

import { db } from "@workspace/db";
import { boards, competitions } from "@workspace/db/schema";
import { log } from "@workspace/server/log";

import { canAccessBoard } from "@/lib/boards";
import { requireSession } from "@/lib/session";
import {
  checkInRowsFromWcif,
  checkInRowsToCsv,
} from "@/lib/wca-authenticated-wcif";

import {
  BOARDS_TOOLS_DENIED_MESSAGE,
  boardHasToolsBeta,
} from "../../_lib/boards-tools-beta";
import {
  assertCompetitionDelegateOrOrganizer,
  loadAuthenticatedWcifForCompetition,
} from "../../_lib/competitor-email";

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
  if (!(await boardHasToolsBeta(boardId))) {
    return new Response(BOARDS_TOOLS_DENIED_MESSAGE, { status: 403 });
  }

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { competitionId: true },
  });
  if (!board?.competitionId) {
    return new Response("Este tablero no está ligado a una competencia", {
      status: 404,
    });
  }

  const competition = await db.query.competitions.findFirst({
    where: eq(competitions.id, board.competitionId),
    columns: { id: true, wcaCompetitionUrl: true },
  });
  if (!competition) {
    return new Response("Competencia no encontrada", { status: 404 });
  }

  const role = await assertCompetitionDelegateOrOrganizer({
    competitionId: competition.id,
    userId: authResult.session.user.id,
    wcaId: authResult.session.user.wcaId ?? null,
  });
  if (!role.ok) {
    return new Response(role.message, { status: 403 });
  }

  const loaded = await loadAuthenticatedWcifForCompetition({
    userId: authResult.session.user.id,
    wcaCompetitionUrl: competition.wcaCompetitionUrl,
  });
  if (!loaded.ok) {
    return new Response(loaded.message, { status: 409 });
  }

  try {
    const rows = checkInRowsFromWcif(loaded.wcif.persons);
    const csv = checkInRowsToCsv(rows);
    const filename = `registro-${loaded.wcaId}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    log.error("boards.check_in_csv_failed", { boardId, error });
    return new Response("No se pudo generar la lista de registro", {
      status: 500,
    });
  }
}
