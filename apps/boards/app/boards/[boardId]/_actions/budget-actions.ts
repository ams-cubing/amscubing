"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@workspace/db";
import {
  BudgetError,
  ensureCompetitionBudget,
  removeCompetitionSponsor,
  submitBudgetStage,
  updateBudgetActuals,
  updateBudgetPlan,
  upsertCompetitionSponsor,
  type CompetitionBudgetSheet,
} from "@workspace/db/budget";
import {
  budgetSubmittedNotificationRow,
  competitionDelegatesOnly,
  insertNotifications,
} from "@workspace/db/notifications";
import { consumeRateLimit } from "@workspace/db/rate-limit";
import { boards, competitions } from "@workspace/db/schema";
import { log } from "@workspace/server/log";

import { canAccessBoard } from "@/lib/boards";
import { requireSessionOrUnauthorized } from "@/lib/session";
import { getCalendarUrl } from "@/lib/urls";
import {
  fetchWcaRegistrationRevenueEstimate,
  type WcaRegistrationRevenueEstimate,
} from "@/lib/wca-registration-revenue";
import { assertCardOnBoard, requireBoardAccess } from "../_lib/board-access";
import {
  BOARDS_TOOLS_DENIED_MESSAGE,
  boardsToolsBetaDenial,
  boardHasToolsBeta,
} from "../_lib/boards-tools-beta";
import {
  budgetCardMode,
  type BudgetCardMode,
} from "../_lib/budget-cards";

export type BudgetCardData = CompetitionBudgetSheet;

export type BudgetCardResult =
  | { ok: true; data: BudgetCardData | null }
  | { ok: false; message: string };

export type BudgetMutationResult =
  | { ok: true; message: string; data: BudgetCardData }
  | { ok: false; message: string };

async function budgetCardCompetition(
  boardId: number,
  cardId: number,
  allowed: BudgetCardMode | BudgetCardMode[],
) {
  const card = await assertCardOnBoard(boardId, cardId);
  const mode = budgetCardMode(card.title);
  const allowedModes = Array.isArray(allowed) ? allowed : [allowed];
  if (!mode || !allowedModes.includes(mode)) {
    throw new Error("Esta tarjeta no maneja el presupuesto");
  }
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { competitionId: true },
  });
  return { competitionId: board?.competitionId ?? null, mode };
}

async function rateLimit(userId: string) {
  const { allowed } = await consumeRateLimit({
    key: `boards:budget:user:${userId}`,
    windowMs: 10 * 60 * 1000,
    max: 60,
  });
  return allowed;
}

export async function loadBudgetCard(input: {
  boardId: number;
  cardId: number;
}): Promise<BudgetCardResult> {
  const session = await requireSessionOrUnauthorized();
  if (!(await canAccessBoard(session.user, input.boardId))) {
    return { ok: false, message: "No tienes acceso a este tablero" };
  }
  if (!(await boardHasToolsBeta(input.boardId))) {
    return { ok: false, message: BOARDS_TOOLS_DENIED_MESSAGE };
  }
  const { competitionId } = await budgetCardCompetition(input.boardId, input.cardId, [
    "plan",
    "mid",
    "final",
    "sponsors",
  ]);
  if (!competitionId) return { ok: true, data: null };
  return { ok: true, data: await ensureCompetitionBudget(db, competitionId) };
}

const cardSchema = z.object({
  boardId: z.number().int().positive(),
  cardId: z.number().int().positive(),
});

const lineCategory = z.enum([
  "sede",
  "viaticos_transporte",
  "viaticos_hospedaje",
  "viaticos_alimentos",
  "materiales",
  "comida_staff",
  "premios",
  "papeleria",
  "cuota_wca",
  "cuota_ams",
  "inscripciones",
  "patrocinio_efectivo",
  "otros",
]);

const savePlanSchema = cardSchema.extend({
  proposedRegistrationFeeCents: z.number().int().min(0).max(1_000_000_00),
  expectedCompetitorCount: z.number().int().min(0).max(5000),
  lines: z
    .array(
      z.object({
        id: z.number().int().positive().optional(),
        kind: z.enum(["expense", "income"]),
        category: lineCategory,
        label: z.string().max(160),
        expectedCents: z.number().int().min(0).max(50_000_000_00),
        notes: z.string().max(1000).optional(),
      }),
    )
    .max(80),
  submit: z.boolean(),
});

export async function saveBudgetPlanFromCard(
  raw: z.input<typeof savePlanSchema>,
): Promise<BudgetMutationResult> {
  const parsed = savePlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Revisa los montos del presupuesto" };
  }
  const input = parsed.data;
  const actor = await requireBoardAccess(input.boardId);
  const betaDenied = await boardsToolsBetaDenial(input.boardId);
  if (betaDenied) {
    return { ok: false, message: betaDenied };
  }
  if (!(await rateLimit(actor.id))) {
    return {
      ok: false,
      message: "Espera unos minutos antes de seguir editando el presupuesto",
    };
  }
  const { competitionId } = await budgetCardCompetition(
    input.boardId,
    input.cardId,
    "plan",
  );
  if (!competitionId) {
    return {
      ok: false,
      message: "Este tablero no está ligado a una competencia",
    };
  }

  try {
    let resubmitting = false;
    const data = await db.transaction(async (tx) => {
      const before = await ensureCompetitionBudget(tx, competitionId);
      resubmitting =
        input.submit && before.budget.status === "plan_submitted";
      let sheet = await updateBudgetPlan(tx, {
        competitionId,
        proposedRegistrationFeeCents: input.proposedRegistrationFeeCents,
        expectedCompetitorCount: input.expectedCompetitorCount,
        lines: input.lines,
      });
      if (input.submit) {
        sheet = await submitBudgetStage(tx, {
          competitionId,
          stage: "plan",
          actorUserId: actor.id,
        });
        const delegates = await competitionDelegatesOnly(tx, competitionId);
        await insertNotifications(
          tx,
          delegates.map((delegate) =>
            budgetSubmittedNotificationRow({
              recipient: delegate,
              actorId: actor.id,
              calendarUrl: getCalendarUrl(),
              competitionId,
              budgetId: sheet.budget.id,
              city: sheet.competition.name?.trim() || sheet.competition.city,
              type: "budget_plan_submitted",
            }),
          ),
        );
      }
      return sheet;
    });
    return {
      ok: true,
      message: input.submit
        ? resubmitting
          ? "Presupuesto reenviado al delegado"
          : "Presupuesto enviado al delegado"
        : "Presupuesto guardado",
      data,
    };
  } catch (error) {
    if (error instanceof BudgetError) {
      return { ok: false, message: error.message };
    }
    if (error instanceof Error && /sesión desactualizada/i.test(error.message)) {
      return { ok: false, message: error.message };
    }
    log.error("boards.budget.plan_failed", { error, competitionId });
    return { ok: false, message: "No se pudo guardar el presupuesto" };
  }
}

const saveActualsSchema = cardSchema.extend({
  registrationRevenueCents: z.number().int().min(0).max(50_000_000_00),
  remanenteNote: z.string().max(2000).optional(),
  lines: z
    .array(
      z.object({
        id: z.number().int().positive(),
        actualCents: z.number().int().min(0).max(50_000_000_00),
        receiptStatus: z.enum(["pending", "in_drive", "missing_reason"]),
        receiptMissingReason: z.string().max(500).optional(),
        notes: z.string().max(1000).optional(),
      }),
    )
    .max(80),
  stage: z.enum(["mid", "final"]),
  submit: z.boolean(),
});

export async function saveBudgetActualsFromCard(
  raw: z.input<typeof saveActualsSchema>,
): Promise<BudgetMutationResult> {
  const parsed = saveActualsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Revisa los costos reales" };
  }
  const input = parsed.data;
  const actor = await requireBoardAccess(input.boardId);
  const betaDenied = await boardsToolsBetaDenial(input.boardId);
  if (betaDenied) {
    return { ok: false, message: betaDenied };
  }
  if (!(await rateLimit(actor.id))) {
    return {
      ok: false,
      message: "Espera unos minutos antes de seguir editando el presupuesto",
    };
  }
  const { competitionId } = await budgetCardCompetition(
    input.boardId,
    input.cardId,
    input.stage,
  );
  if (!competitionId) {
    return {
      ok: false,
      message: "Este tablero no está ligado a una competencia",
    };
  }

  try {
    const data = await db.transaction(async (tx) => {
      let sheet = await updateBudgetActuals(tx, {
        competitionId,
        registrationRevenueCents: input.registrationRevenueCents,
        remanenteNote: input.remanenteNote,
        lines: input.lines,
      });
      if (input.submit) {
        sheet = await submitBudgetStage(tx, {
          competitionId,
          stage: input.stage,
          actorUserId: actor.id,
        });
        const delegates = await competitionDelegatesOnly(tx, competitionId);
        await insertNotifications(
          tx,
          delegates.map((delegate) =>
            budgetSubmittedNotificationRow({
              recipient: delegate,
              actorId: actor.id,
              calendarUrl: getCalendarUrl(),
              competitionId,
              budgetId: sheet.budget.id,
              city: sheet.competition.name?.trim() || sheet.competition.city,
              type:
                input.stage === "mid"
                  ? "budget_mid_submitted"
                  : "budget_final_submitted",
            }),
          ),
        );
      }
      return sheet;
    });
    return {
      ok: true,
      message: input.submit
        ? input.stage === "mid"
          ? "Primer avance enviado al delegado"
          : "Informe final enviado al delegado"
        : "Costos reales guardados",
      data,
    };
  } catch (error) {
    if (error instanceof BudgetError) {
      return { ok: false, message: error.message };
    }
    log.error("boards.budget.actuals_failed", { error, competitionId });
    return { ok: false, message: "No se pudieron guardar los costos reales" };
  }
}

export type EstimateRegistrationRevenueResult =
  | { ok: true; estimate: WcaRegistrationRevenueEstimate }
  | { ok: false; message: string };

/** Prefills inscription revenue from accepted WCA competitors (excl. staff). */
export async function estimateRegistrationRevenueFromWca(input: {
  boardId: number;
  cardId: number;
}): Promise<EstimateRegistrationRevenueResult> {
  const session = await requireSessionOrUnauthorized();
  if (!(await canAccessBoard(session.user, input.boardId))) {
    return { ok: false, message: "No tienes acceso a este tablero" };
  }
  if (!(await boardHasToolsBeta(input.boardId))) {
    return { ok: false, message: BOARDS_TOOLS_DENIED_MESSAGE };
  }
  if (!(await rateLimit(session.user.id))) {
    return {
      ok: false,
      message: "Espera unos minutos antes de consultar la WCA de nuevo",
    };
  }

  const { competitionId } = await budgetCardCompetition(
    input.boardId,
    input.cardId,
    ["mid", "final"],
  );
  if (!competitionId) {
    return {
      ok: false,
      message: "Este tablero no está ligado a una competencia",
    };
  }

  const [competition, sheet] = await Promise.all([
    db.query.competitions.findFirst({
      where: eq(competitions.id, competitionId),
      columns: { wcaCompetitionUrl: true },
    }),
    ensureCompetitionBudget(db, competitionId),
  ]);

  const wcaUrl = competition?.wcaCompetitionUrl?.trim();
  if (!wcaUrl) {
    return {
      ok: false,
      message:
        "Falta la URL de la WCA en la tarjeta Sitio web para consultar inscritos.",
    };
  }

  return fetchWcaRegistrationRevenueEstimate({
    wcaCompetitionUrl: wcaUrl,
    budgetFeeCents: sheet.budget.proposedRegistrationFeeCents,
  });
}

const sponsorSchema = cardSchema.extend({
  sponsorId: z.number().int().positive().optional(),
  name: z.string().max(160),
  type: z.enum(["cash", "in_kind"]),
  amountCents: z.number().int().min(0).max(50_000_000_00).nullable().optional(),
  conditions: z.string().max(2000).optional(),
  logoUrl: z.string().max(2000).optional(),
});

export async function saveSponsorFromCard(
  raw: z.input<typeof sponsorSchema>,
): Promise<BudgetMutationResult> {
  const parsed = sponsorSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Revisa los datos del patrocinador" };
  }
  const input = parsed.data;
  const actor = await requireBoardAccess(input.boardId);
  const betaDenied = await boardsToolsBetaDenial(input.boardId);
  if (betaDenied) {
    return { ok: false, message: betaDenied };
  }
  if (!(await rateLimit(actor.id))) {
    return {
      ok: false,
      message: "Espera unos minutos antes de seguir editando patrocinios",
    };
  }
  const { competitionId } = await budgetCardCompetition(
    input.boardId,
    input.cardId,
    "sponsors",
  );
  if (!competitionId) {
    return {
      ok: false,
      message: "Este tablero no está ligado a una competencia",
    };
  }

  try {
    const data = await upsertCompetitionSponsor(db, {
      competitionId,
      sponsorId: input.sponsorId,
      name: input.name,
      type: input.type,
      amountCents: input.amountCents,
      conditions: input.conditions,
      logoUrl: input.logoUrl,
      actorUserId: actor.id,
    });
    return {
      ok: true,
      message: input.sponsorId ? "Patrocinador actualizado" : "Patrocinador agregado",
      data,
    };
  } catch (error) {
    if (error instanceof BudgetError) {
      return { ok: false, message: error.message };
    }
    log.error("boards.budget.sponsor_failed", { error, competitionId });
    return { ok: false, message: "No se pudo guardar el patrocinador" };
  }
}

const removeSponsorSchema = cardSchema.extend({
  sponsorId: z.number().int().positive(),
});

export async function removeSponsorFromCard(
  raw: z.input<typeof removeSponsorSchema>,
): Promise<BudgetMutationResult> {
  const parsed = removeSponsorSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Patrocinador inválido" };
  }
  const input = parsed.data;
  const actor = await requireBoardAccess(input.boardId);
  const betaDenied = await boardsToolsBetaDenial(input.boardId);
  if (betaDenied) {
    return { ok: false, message: betaDenied };
  }
  if (!(await rateLimit(actor.id))) {
    return {
      ok: false,
      message: "Espera unos minutos antes de seguir editando patrocinios",
    };
  }
  const { competitionId } = await budgetCardCompetition(
    input.boardId,
    input.cardId,
    "sponsors",
  );
  if (!competitionId) {
    return {
      ok: false,
      message: "Este tablero no está ligado a una competencia",
    };
  }

  try {
    const data = await removeCompetitionSponsor(db, {
      competitionId,
      sponsorId: input.sponsorId,
    });
    return { ok: true, message: "Patrocinador eliminado", data };
  } catch (error) {
    if (error instanceof BudgetError) {
      return { ok: false, message: error.message };
    }
    log.error("boards.budget.sponsor_remove_failed", { error, competitionId });
    return { ok: false, message: "No se pudo eliminar el patrocinador" };
  }
}
