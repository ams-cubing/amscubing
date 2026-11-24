"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@workspace/db";
import {
  BOARDS_TOOLS_DENIED_MESSAGE,
  userHasBoardsToolsBeta,
} from "@workspace/db/beta-features";
import {
  BudgetError,
  decideBudgetStage,
  setBudgetDriveUrls,
} from "@workspace/db/budget";
import {
  BUDGET_FINAL_CARD_TITLE,
  BUDGET_MID_CARD_TITLE,
  BUDGET_PLAN_CARD_TITLE,
} from "@workspace/db/data/ams-board-template";
import {
  budgetStageApprovedNotificationRow,
  competitionOrganizersOnly,
  insertNotifications,
} from "@workspace/db/notifications";
import { boardLists, boards, cards } from "@workspace/db/schema";
import { ActionError, runAction, type ActionResult } from "@workspace/server/action";
import { log } from "@workspace/server/log";

import { requireDelegate } from "@/lib/session";
import { getBoardsUrl, getCalendarUrl } from "@/lib/urls";

async function requireBudgetDelegate() {
  const result = await requireDelegate();
  if (!result.ok) {
    throw new ActionError(result.message ?? "Solo delegados");
  }
  if (!(await userHasBoardsToolsBeta(db, result.session.user.id))) {
    throw new ActionError(BOARDS_TOOLS_DENIED_MESSAGE);
  }
  return result.session.user;
}

async function findBudgetCard(
  competitionId: number,
  titles: string[],
): Promise<{ boardId?: number; cardId?: number }> {
  const board = await db.query.boards.findFirst({
    where: eq(boards.competitionId, competitionId),
    columns: { id: true },
  });
  if (!board) return {};
  const rows = await db
    .select({ id: cards.id, title: cards.title })
    .from(cards)
    .innerJoin(boardLists, eq(boardLists.id, cards.listId))
    .where(eq(boardLists.boardId, board.id));
  const match = rows.find((row) => titles.includes(row.title.trim()));
  return { boardId: board.id, cardId: match?.id };
}

async function notifyOrganizersOfStage(input: {
  actorId: string;
  competitionId: number;
  budgetId: number;
  city: string;
  statusLabel: string;
  budgetStage: string;
  cardTitles: string[];
  reviewNote?: string | null;
}) {
  const [organizers, cardLink] = await Promise.all([
    competitionOrganizersOnly(db, input.competitionId),
    findBudgetCard(input.competitionId, input.cardTitles),
  ]);
  await insertNotifications(
    db,
    organizers.map((organizer) => {
      const row = budgetStageApprovedNotificationRow({
        recipient: organizer,
        actorId: input.actorId,
        urls: {
          calendarUrl: getCalendarUrl(),
          boardsUrl: getBoardsUrl(),
        },
        competitionId: input.competitionId,
        budgetId: input.budgetId,
        city: input.city,
        statusLabel: input.statusLabel,
        budgetStage: input.budgetStage,
        boardId: cardLink.boardId,
        cardId: cardLink.cardId,
      });
      if (input.reviewNote) {
        row.payload = {
          ...row.payload,
          reviewNote: input.reviewNote,
        };
      }
      return row;
    }),
  );
}

export async function setBudgetDriveUrlsAction(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireBudgetDelegate();
    const competitionId = Number(data.get("competitionId"));
    if (!Number.isInteger(competitionId) || competitionId <= 0) {
      throw new ActionError("Competencia inválida");
    }
    const receiptsDriveUrl = String(data.get("receiptsDriveUrl") ?? "");
    const spreadsheetUrl = String(data.get("spreadsheetUrl") ?? "");
    try {
      await setBudgetDriveUrls(db, {
        competitionId,
        receiptsDriveUrl,
        spreadsheetUrl,
      });
    } catch (error) {
      if (error instanceof BudgetError) throw new ActionError(error.message);
      throw error;
    }
    log.info("calendar.budget.drive_urls_set", {
      competitionId,
      actorId: actor.id,
    });
    return { ok: true, message: "Enlaces de Drive guardados" };
  });
}

export async function decideBudgetStageAction(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireBudgetDelegate();
    const competitionId = Number(data.get("competitionId"));
    const stage = String(data.get("stage") ?? "");
    const decision = String(data.get("decision") ?? "");
    const remanenteDecision = String(data.get("remanenteDecision") ?? "");
    const reviewNote = String(data.get("reviewNote") ?? "");
    const parsed = z
      .object({
        competitionId: z.number().int().positive(),
        stage: z.enum(["plan", "mid", "final"]),
        decision: z.enum(["approved", "rejected"]),
        remanenteDecision: z.string().max(2000).optional(),
        reviewNote: z.string().max(2000).optional(),
      })
      .safeParse({
        competitionId,
        stage,
        decision,
        remanenteDecision: remanenteDecision || undefined,
        reviewNote: reviewNote || undefined,
      });
    if (!parsed.success) throw new ActionError("Solicitud inválida");

    try {
      const sheet = await decideBudgetStage(db, {
        competitionId: parsed.data.competitionId,
        stage: parsed.data.stage,
        decision: parsed.data.decision,
        actorUserId: actor.id,
        remanenteDecision: parsed.data.remanenteDecision,
        reviewNote: parsed.data.reviewNote,
      });
      const labels = {
        plan: {
          approved: "presupuesto aprobado",
          rejected: "presupuesto devuelto",
          titles: [
            BUDGET_PLAN_CARD_TITLE,
            "Excel de costos y viabilidad",
          ],
        },
        mid: {
          approved: "primer avance aprobado",
          rejected: "primer avance devuelto",
          titles: [BUDGET_MID_CARD_TITLE, "Manejo de fondos del evento"],
        },
        final: {
          approved: "informe final cerrado",
          rejected: "informe final devuelto",
          titles: [
            BUDGET_FINAL_CARD_TITLE,
            "Generar un resumen financiero del evento",
          ],
        },
      }[parsed.data.stage];
      await notifyOrganizersOfStage({
        actorId: actor.id,
        competitionId: parsed.data.competitionId,
        budgetId: sheet.budget.id,
        city: sheet.competition.name?.trim() || sheet.competition.city,
        statusLabel:
          parsed.data.decision === "approved"
            ? labels.approved
            : labels.rejected,
        budgetStage: parsed.data.stage,
        cardTitles: labels.titles,
        reviewNote:
          parsed.data.decision === "rejected"
            ? parsed.data.reviewNote
            : null,
      });
      log.info("calendar.budget.stage_decided", {
        competitionId: parsed.data.competitionId,
        stage: parsed.data.stage,
        decision: parsed.data.decision,
        actorId: actor.id,
      });
      return {
        ok: true,
        message:
          parsed.data.decision === "approved"
            ? "Etapa aprobada"
            : "Devuelto a los organizadores",
      };
    } catch (error) {
      if (error instanceof BudgetError) throw new ActionError(error.message);
      throw error;
    }
  });
}

