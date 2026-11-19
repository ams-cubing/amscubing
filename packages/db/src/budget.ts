import { and, asc, eq, inArray } from "drizzle-orm";

import type { db } from "./index";
import {
  ACTUALS_EDITABLE_STATUSES,
  BUDGET_LINE_CATEGORY_LABELS,
  DEFAULT_EXPENSE_CATEGORIES,
  FEE_RATE_BPS,
  PLAN_EDITABLE_STATUSES,
  type BudgetLineCategory,
  type BudgetReceiptStatus,
  type BudgetSpendStatus,
  type BudgetStatus,
  type SponsorType,
} from "./budget-labels";
import {
  competitionBudgetLines,
  competitionBudgets,
  competitionSponsors,
  type CompetitionBudget,
  type CompetitionBudgetLine,
  type CompetitionSponsor,
} from "./schema/budget";
import { competitions } from "./schema/competitions";

export class BudgetError extends Error {}

type DbOrTx = Pick<
  typeof db,
  "select" | "insert" | "update" | "delete" | "query" | "transaction"
>;

export type BudgetLineInput = {
  id?: number;
  kind: "expense" | "income";
  category: BudgetLineCategory;
  label: string;
  expectedCents: number;
  actualCents?: number | null;
  notes?: string | null;
};

export type BudgetSummary = {
  expectedExpenseCents: number;
  expectedIncomeCents: number;
  expectedNetCents: number;
  actualExpenseCents: number;
  actualIncomeCents: number;
  actualNetCents: number;
  breakEvenCompetitors: number | null;
};

export type CompetitionBudgetSheet = {
  competition: {
    id: number;
    name: string | null;
    city: string;
    capacity: number;
  };
  budget: CompetitionBudget;
  lines: CompetitionBudgetLine[];
  sponsors: CompetitionSponsor[];
  summary: BudgetSummary;
};

function assertNonNegativeCents(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new BudgetError(`${label} inválido`);
  }
}

function feeCents(baseCents: number) {
  return Math.round((baseCents * FEE_RATE_BPS) / 10_000);
}

export function summarizeBudgetLines(
  lines: Pick<
    CompetitionBudgetLine,
    "kind" | "category" | "expectedCents" | "actualCents"
  >[],
  feeCentsPerCompetitor: number,
): BudgetSummary {
  let expectedExpenseCents = 0;
  let expectedIncomeCents = 0;
  let actualExpenseCents = 0;
  let actualIncomeCents = 0;
  let nonRegistrationExpectedIncome = 0;

  for (const line of lines) {
    if (line.kind === "expense") {
      expectedExpenseCents += line.expectedCents;
      actualExpenseCents += line.actualCents ?? 0;
    } else {
      expectedIncomeCents += line.expectedCents;
      actualIncomeCents += line.actualCents ?? 0;
      if (line.category !== "inscripciones") {
        nonRegistrationExpectedIncome += line.expectedCents;
      }
    }
  }

  const uncovered = Math.max(
    0,
    expectedExpenseCents - nonRegistrationExpectedIncome,
  );
  const breakEvenCompetitors =
    feeCentsPerCompetitor > 0
      ? Math.ceil(uncovered / feeCentsPerCompetitor)
      : null;

  return {
    expectedExpenseCents,
    expectedIncomeCents,
    expectedNetCents: expectedIncomeCents - expectedExpenseCents,
    actualExpenseCents,
    actualIncomeCents,
    actualNetCents: actualIncomeCents - actualExpenseCents,
    breakEvenCompetitors,
  };
}

async function loadLines(dbx: DbOrTx, budgetId: number) {
  return dbx
    .select()
    .from(competitionBudgetLines)
    .where(eq(competitionBudgetLines.budgetId, budgetId))
    .orderBy(
      asc(competitionBudgetLines.sortOrder),
      asc(competitionBudgetLines.id),
    );
}

async function loadSponsors(dbx: DbOrTx, competitionId: number) {
  return dbx
    .select()
    .from(competitionSponsors)
    .where(eq(competitionSponsors.competitionId, competitionId))
    .orderBy(asc(competitionSponsors.name));
}

function seedLineRows(budgetId: number) {
  const rows: (typeof competitionBudgetLines.$inferInsert)[] = [];
  let sortOrder = 0;
  for (const category of DEFAULT_EXPENSE_CATEGORIES) {
    rows.push({
      budgetId,
      kind: "expense",
      category,
      label: BUDGET_LINE_CATEGORY_LABELS[category],
      expectedCents: 0,
      isSystem: false,
      sortOrder: sortOrder++,
    });
  }
  for (const category of ["cuota_wca", "cuota_ams"] as const) {
    rows.push({
      budgetId,
      kind: "expense",
      category,
      label: BUDGET_LINE_CATEGORY_LABELS[category],
      expectedCents: 0,
      isSystem: true,
      sortOrder: sortOrder++,
    });
  }
  rows.push({
    budgetId,
    kind: "income",
    category: "inscripciones",
    label: BUDGET_LINE_CATEGORY_LABELS.inscripciones,
    expectedCents: 0,
    isSystem: true,
    sortOrder: sortOrder++,
  });
  return rows;
}

async function syncSystemLines(
  dbx: DbOrTx,
  budget: CompetitionBudget,
  lines: CompetitionBudgetLine[],
) {
  const registrationExpected =
    budget.proposedRegistrationFeeCents * budget.expectedCompetitorCount;
  const registrationActual =
    budget.registrationRevenueCents ?? registrationExpected;
  const wcaExpected = feeCents(registrationExpected);
  const amsExpected = feeCents(registrationExpected);
  const wcaActual = feeCents(registrationActual);
  const amsActual = feeCents(registrationActual);

  const updates: Promise<unknown>[] = [];
  for (const line of lines) {
    if (!line.isSystem) continue;
    if (line.category === "cuota_wca") {
      updates.push(
        dbx
          .update(competitionBudgetLines)
          .set({
            expectedCents: wcaExpected,
            actualCents:
              budget.registrationRevenueCents != null ? wcaActual : null,
            updatedAt: new Date(),
          })
          .where(eq(competitionBudgetLines.id, line.id)),
      );
    } else if (line.category === "cuota_ams") {
      updates.push(
        dbx
          .update(competitionBudgetLines)
          .set({
            expectedCents: amsExpected,
            actualCents:
              budget.registrationRevenueCents != null ? amsActual : null,
            updatedAt: new Date(),
          })
          .where(eq(competitionBudgetLines.id, line.id)),
      );
    } else if (line.category === "inscripciones") {
      updates.push(
        dbx
          .update(competitionBudgetLines)
          .set({
            expectedCents: registrationExpected,
            actualCents: budget.registrationRevenueCents,
            updatedAt: new Date(),
          })
          .where(eq(competitionBudgetLines.id, line.id)),
      );
    }
  }
  await Promise.all(updates);
}

/** Create budget + default lines if missing; always returns the sheet. */
export async function ensureCompetitionBudget(
  dbx: DbOrTx,
  competitionId: number,
): Promise<CompetitionBudgetSheet> {
  const competition = await dbx.query.competitions.findFirst({
    where: eq(competitions.id, competitionId),
    columns: { id: true, name: true, city: true, capacity: true },
  });
  if (!competition) throw new BudgetError("Competencia no encontrada");

  let budget = await dbx.query.competitionBudgets.findFirst({
    where: eq(competitionBudgets.competitionId, competitionId),
  });

  if (!budget) {
    const [created] = await dbx
      .insert(competitionBudgets)
      .values({
        competitionId,
        expectedCompetitorCount: competition.capacity,
      })
      .returning();
    budget = created!;
    await dbx.insert(competitionBudgetLines).values(seedLineRows(budget.id));
  }

  let lines = await loadLines(dbx, budget.id);
  await syncSystemLines(dbx, budget, lines);
  lines = await loadLines(dbx, budget.id);
  const sponsors = await loadSponsors(dbx, competitionId);
  const summary = summarizeBudgetLines(
    lines,
    budget.proposedRegistrationFeeCents,
  );

  return { competition, budget, lines, sponsors, summary };
}

export async function getCompetitionBudgetSheet(
  dbx: DbOrTx,
  competitionId: number,
): Promise<CompetitionBudgetSheet | null> {
  const existing = await dbx.query.competitionBudgets.findFirst({
    where: eq(competitionBudgets.competitionId, competitionId),
    columns: { id: true },
  });
  if (!existing) return null;
  return ensureCompetitionBudget(dbx, competitionId);
}

function requirePlanEditable(status: BudgetStatus) {
  if (!PLAN_EDITABLE_STATUSES.includes(status)) {
    throw new BudgetError(
      "El presupuesto ya no se puede editar en esta etapa",
    );
  }
}

function requireActualsEditable(status: BudgetStatus) {
  if (!ACTUALS_EDITABLE_STATUSES.includes(status)) {
    throw new BudgetError(
      "Los costos reales no se pueden editar en esta etapa",
    );
  }
}

export async function updateBudgetPlan(
  dbx: DbOrTx,
  input: {
    competitionId: number;
    proposedRegistrationFeeCents: number;
    expectedCompetitorCount: number;
    lines: BudgetLineInput[];
  },
) {
  assertNonNegativeCents(
    input.proposedRegistrationFeeCents,
    "Cuota de inscripción",
  );
  if (
    !Number.isInteger(input.expectedCompetitorCount) ||
    input.expectedCompetitorCount < 0
  ) {
    throw new BudgetError("Número de competidores inválido");
  }

  const sheet = await ensureCompetitionBudget(dbx, input.competitionId);
  requirePlanEditable(sheet.budget.status);

  const existingById = new Map(sheet.lines.map((line) => [line.id, line]));
  const keptIds = new Set<number>();

  for (const line of input.lines) {
    assertNonNegativeCents(line.expectedCents, "Monto esperado");
    const label = line.label.trim() || BUDGET_LINE_CATEGORY_LABELS[line.category];
    if (line.id) {
      const existing = existingById.get(line.id);
      if (!existing) throw new BudgetError("Renglón no encontrado");
      if (existing.isSystem || existing.sponsorId != null) {
        keptIds.add(line.id);
        continue;
      }
      keptIds.add(line.id);
      await dbx
        .update(competitionBudgetLines)
        .set({
          kind: line.kind,
          category: line.category,
          label,
          expectedCents: line.expectedCents,
          notes: line.notes?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(competitionBudgetLines.id, line.id));
    } else {
      const maxSort = Math.max(0, ...sheet.lines.map((l) => l.sortOrder));
      const [created] = await dbx
        .insert(competitionBudgetLines)
        .values({
          budgetId: sheet.budget.id,
          kind: line.kind,
          category: line.category,
          label,
          expectedCents: line.expectedCents,
          notes: line.notes?.trim() || null,
          spendStatus: "none",
          sortOrder: maxSort + 1 + keptIds.size,
        })
        .returning();
      keptIds.add(created!.id);
    }
  }

  const toDelete = sheet.lines.filter(
    (line) =>
      !line.isSystem && line.sponsorId == null && !keptIds.has(line.id),
  );
  if (toDelete.length > 0) {
    await dbx.delete(competitionBudgetLines).where(
      inArray(
        competitionBudgetLines.id,
        toDelete.map((line) => line.id),
      ),
    );
  }

  await dbx
    .update(competitionBudgets)
    .set({
      proposedRegistrationFeeCents: input.proposedRegistrationFeeCents,
      expectedCompetitorCount: input.expectedCompetitorCount,
      status: "draft",
      updatedAt: new Date(),
    })
    .where(eq(competitionBudgets.id, sheet.budget.id));

  return ensureCompetitionBudget(dbx, input.competitionId);
}

export async function updateBudgetActuals(
  dbx: DbOrTx,
  input: {
    competitionId: number;
    registrationRevenueCents: number;
    remanenteNote?: string | null;
    lines: {
      id: number;
      actualCents: number;
      receiptStatus: BudgetReceiptStatus;
      receiptMissingReason?: string | null;
      notes?: string | null;
    }[];
  },
) {
  assertNonNegativeCents(input.registrationRevenueCents, "Ingresos de inscripción");
  const sheet = await ensureCompetitionBudget(dbx, input.competitionId);
  requireActualsEditable(sheet.budget.status);

  const byId = new Map(sheet.lines.map((line) => [line.id, line]));
  for (const line of input.lines) {
    const existing = byId.get(line.id);
    if (!existing) throw new BudgetError("Renglón no encontrado");
    if (existing.isSystem) continue;
    assertNonNegativeCents(line.actualCents, "Monto real");
    if (
      line.receiptStatus === "missing_reason" &&
      !line.receiptMissingReason?.trim()
    ) {
      throw new BudgetError(
        "Indica el motivo si no hay comprobante para un gasto",
      );
    }
    await dbx
      .update(competitionBudgetLines)
      .set({
        actualCents: line.actualCents,
        receiptStatus: line.receiptStatus,
        receiptMissingReason:
          line.receiptStatus === "missing_reason"
            ? line.receiptMissingReason?.trim() || null
            : null,
        notes: line.notes?.trim() || existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(competitionBudgetLines.id, line.id));
  }

  await dbx
    .update(competitionBudgets)
    .set({
      registrationRevenueCents: input.registrationRevenueCents,
      remanenteNote:
        input.remanenteNote !== undefined
          ? input.remanenteNote?.trim() || null
          : sheet.budget.remanenteNote,
      updatedAt: new Date(),
    })
    .where(eq(competitionBudgets.id, sheet.budget.id));

  return ensureCompetitionBudget(dbx, input.competitionId);
}

export async function setBudgetDriveUrls(
  dbx: DbOrTx,
  input: {
    competitionId: number;
    receiptsDriveUrl?: string | null;
    spreadsheetUrl?: string | null;
  },
) {
  const sheet = await ensureCompetitionBudget(dbx, input.competitionId);
  const receiptsDriveUrl =
    input.receiptsDriveUrl !== undefined
      ? input.receiptsDriveUrl?.trim() || null
      : sheet.budget.receiptsDriveUrl;
  const spreadsheetUrl =
    input.spreadsheetUrl !== undefined
      ? input.spreadsheetUrl?.trim() || null
      : sheet.budget.spreadsheetUrl;

  if (receiptsDriveUrl && !/^https?:\/\//i.test(receiptsDriveUrl)) {
    throw new BudgetError("La URL de la carpeta de Drive no es válida");
  }
  if (spreadsheetUrl && !/^https?:\/\//i.test(spreadsheetUrl)) {
    throw new BudgetError("La URL del Excel no es válida");
  }

  await dbx
    .update(competitionBudgets)
    .set({
      receiptsDriveUrl,
      spreadsheetUrl,
      updatedAt: new Date(),
    })
    .where(eq(competitionBudgets.id, sheet.budget.id));

  return ensureCompetitionBudget(dbx, input.competitionId);
}

function assertReceiptsReady(sheet: CompetitionBudgetSheet) {
  if (!sheet.budget.receiptsDriveUrl?.trim()) {
    throw new BudgetError(
      "Falta la carpeta de Drive de comprobantes (el delegado debe pegar el enlace)",
    );
  }
  for (const line of sheet.lines) {
    if (line.kind !== "expense") continue;
    if ((line.actualCents ?? 0) <= 0) continue;
    if (line.receiptStatus === "pending") {
      throw new BudgetError(
        `Marca el comprobante de «${line.label}» (en Drive o sin comprobante)`,
      );
    }
    if (
      line.receiptStatus === "missing_reason" &&
      !line.receiptMissingReason?.trim()
    ) {
      throw new BudgetError(
        `Indica el motivo sin comprobante para «${line.label}»`,
      );
    }
  }
}

export async function submitBudgetStage(
  dbx: DbOrTx,
  input: {
    competitionId: number;
    stage: "plan" | "mid" | "final";
    actorUserId: string;
  },
) {
  const sheet = await ensureCompetitionBudget(dbx, input.competitionId);
  const now = new Date();

  if (input.stage === "plan") {
    if (sheet.budget.status !== "draft" && sheet.budget.status !== "plan_submitted") {
      throw new BudgetError("El presupuesto ya fue aprobado o avanzó de etapa");
    }
    if (sheet.budget.proposedRegistrationFeeCents <= 0) {
      throw new BudgetError("Define la cuota de inscripción propuesta");
    }
    await dbx
      .update(competitionBudgets)
      .set({
        status: "plan_submitted",
        planSubmittedByUserId: input.actorUserId,
        planSubmittedAt: now,
        reviewNote: null,
        updatedAt: now,
      })
      .where(eq(competitionBudgets.id, sheet.budget.id));
  } else if (input.stage === "mid") {
    if (sheet.budget.status !== "plan_approved") {
      throw new BudgetError(
        "El presupuesto debe estar aprobado antes del primer avance",
      );
    }
    if (sheet.budget.registrationRevenueCents == null) {
      throw new BudgetError("Captura los ingresos de inscripción recaudados");
    }
    assertReceiptsReady(sheet);
    await dbx
      .update(competitionBudgets)
      .set({
        status: "mid_submitted",
        midSubmittedByUserId: input.actorUserId,
        midSubmittedAt: now,
        reviewNote: null,
        updatedAt: now,
      })
      .where(eq(competitionBudgets.id, sheet.budget.id));
  } else {
    if (sheet.budget.status !== "mid_approved") {
      throw new BudgetError(
        "El primer avance debe estar aprobado antes del informe final",
      );
    }
    assertReceiptsReady(sheet);
    await dbx
      .update(competitionBudgets)
      .set({
        status: "final_submitted",
        finalSubmittedByUserId: input.actorUserId,
        finalSubmittedAt: now,
        reviewNote: null,
        updatedAt: now,
      })
      .where(eq(competitionBudgets.id, sheet.budget.id));
  }

  return ensureCompetitionBudget(dbx, input.competitionId);
}

export async function decideBudgetStage(
  dbx: DbOrTx,
  input: {
    competitionId: number;
    stage: "plan" | "mid" | "final";
    decision: "approved" | "rejected";
    actorUserId: string;
    remanenteDecision?: string | null;
    reviewNote?: string | null;
  },
) {
  const sheet = await ensureCompetitionBudget(dbx, input.competitionId);
  const now = new Date();
  const reviewNote = input.reviewNote?.trim() || null;

  if (input.decision === "rejected" && !reviewNote) {
    throw new BudgetError(
      "Escribe el motivo al devolver el presupuesto a los organizadores",
    );
  }

  if (input.stage === "plan") {
    if (sheet.budget.status !== "plan_submitted") {
      throw new BudgetError("No hay un presupuesto pendiente de aprobación");
    }
    if (input.decision === "rejected") {
      await dbx
        .update(competitionBudgets)
        .set({
          status: "draft",
          planSubmittedByUserId: null,
          planSubmittedAt: null,
          reviewNote,
          updatedAt: now,
        })
        .where(eq(competitionBudgets.id, sheet.budget.id));
    } else {
      if (!sheet.budget.receiptsDriveUrl?.trim()) {
        throw new BudgetError(
          "Pega la URL de la carpeta de Drive de comprobantes antes de aprobar",
        );
      }
      await dbx
        .update(competitionBudgets)
        .set({
          status: "plan_approved",
          planApprovedByUserId: input.actorUserId,
          planApprovedAt: now,
          reviewNote: null,
          updatedAt: now,
        })
        .where(eq(competitionBudgets.id, sheet.budget.id));
    }
  } else if (input.stage === "mid") {
    if (sheet.budget.status !== "mid_submitted") {
      throw new BudgetError("No hay un primer avance pendiente de aprobación");
    }
    if (input.decision === "rejected") {
      await dbx
        .update(competitionBudgets)
        .set({
          status: "plan_approved",
          midSubmittedByUserId: null,
          midSubmittedAt: null,
          reviewNote,
          updatedAt: now,
        })
        .where(eq(competitionBudgets.id, sheet.budget.id));
    } else {
      await dbx
        .update(competitionBudgets)
        .set({
          status: "mid_approved",
          midApprovedByUserId: input.actorUserId,
          midApprovedAt: now,
          reviewNote: null,
          updatedAt: now,
        })
        .where(eq(competitionBudgets.id, sheet.budget.id));
    }
  } else {
    if (sheet.budget.status !== "final_submitted") {
      throw new BudgetError("No hay un informe final pendiente de cierre");
    }
    if (input.decision === "rejected") {
      await dbx
        .update(competitionBudgets)
        .set({
          status: "mid_approved",
          finalSubmittedByUserId: null,
          finalSubmittedAt: null,
          reviewNote,
          updatedAt: now,
        })
        .where(eq(competitionBudgets.id, sheet.budget.id));
    } else {
      await dbx
        .update(competitionBudgets)
        .set({
          status: "closed",
          closedByUserId: input.actorUserId,
          closedAt: now,
          remanenteDecision:
            input.remanenteDecision?.trim() || sheet.budget.remanenteDecision,
          reviewNote: null,
          updatedAt: now,
        })
        .where(eq(competitionBudgets.id, sheet.budget.id));
    }
  }

  return ensureCompetitionBudget(dbx, input.competitionId);
}

async function syncCashSponsorBudgetLine(
  dbx: DbOrTx,
  input: {
    competitionId: number;
    sponsorId: number;
    name: string;
    type: SponsorType;
    amountCents: number | null;
  },
) {
  const sheet = await ensureCompetitionBudget(dbx, input.competitionId);
  const existing = sheet.lines.find((line) => line.sponsorId === input.sponsorId);
  const shouldHaveLine =
    input.type === "cash" &&
    input.amountCents != null &&
    input.amountCents > 0;

  if (!shouldHaveLine) {
    if (existing) {
      await dbx
        .delete(competitionBudgetLines)
        .where(eq(competitionBudgetLines.id, existing.id));
    }
    return;
  }

  requirePlanEditable(sheet.budget.status);

  if (existing) {
    await dbx
      .update(competitionBudgetLines)
      .set({
        label: input.name,
        expectedCents: input.amountCents!,
        kind: "income",
        category: "patrocinio_efectivo",
        updatedAt: new Date(),
      })
      .where(eq(competitionBudgetLines.id, existing.id));
    return;
  }

  const maxSort = Math.max(0, ...sheet.lines.map((line) => line.sortOrder));
  await dbx.insert(competitionBudgetLines).values({
    budgetId: sheet.budget.id,
    kind: "income",
    category: "patrocinio_efectivo",
    label: input.name,
    expectedCents: input.amountCents!,
    isSystem: false,
    sponsorId: input.sponsorId,
    spendStatus: "none",
    sortOrder: maxSort + 1,
  });
}

export async function upsertCompetitionSponsor(
  dbx: DbOrTx,
  input: {
    competitionId: number;
    sponsorId?: number;
    name: string;
    type: SponsorType;
    amountCents?: number | null;
    conditions?: string | null;
    logoUrl?: string | null;
    actorUserId: string;
  },
) {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) throw new BudgetError("Escribe el nombre del patrocinador");
  if (name.length > 160) {
    throw new BudgetError("El nombre del patrocinador es demasiado largo");
  }
  const amountCents = input.amountCents ?? null;
  if (input.type === "cash") {
    if (amountCents == null || amountCents <= 0) {
      throw new BudgetError(
        "Indica el monto en efectivo; se suma al presupuesto como ingreso",
      );
    }
    assertNonNegativeCents(amountCents, "Monto del patrocinio");
  } else if (amountCents != null) {
    assertNonNegativeCents(amountCents, "Monto del patrocinio");
  }
  if (input.logoUrl && !/^https?:\/\//i.test(input.logoUrl)) {
    throw new BudgetError("La URL del logo no es válida");
  }

  await ensureCompetitionBudget(dbx, input.competitionId);

  let sponsorId = input.sponsorId;
  if (sponsorId) {
    const updated = await dbx
      .update(competitionSponsors)
      .set({
        name,
        type: input.type,
        amountCents,
        conditions: input.conditions?.trim() || null,
        logoUrl: input.logoUrl?.trim() || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(competitionSponsors.id, sponsorId),
          eq(competitionSponsors.competitionId, input.competitionId),
        ),
      )
      .returning({ id: competitionSponsors.id });
    if (updated.length === 0) {
      throw new BudgetError("Patrocinador no encontrado");
    }
  } else {
    const [created] = await dbx
      .insert(competitionSponsors)
      .values({
        competitionId: input.competitionId,
        name,
        type: input.type,
        amountCents,
        conditions: input.conditions?.trim() || null,
        logoUrl: input.logoUrl?.trim() || null,
        createdByUserId: input.actorUserId,
      })
      .returning({ id: competitionSponsors.id });
    sponsorId = created!.id;
  }

  await syncCashSponsorBudgetLine(dbx, {
    competitionId: input.competitionId,
    sponsorId,
    name,
    type: input.type,
    amountCents,
  });

  return ensureCompetitionBudget(dbx, input.competitionId);
}

export async function removeCompetitionSponsor(
  dbx: DbOrTx,
  input: { competitionId: number; sponsorId: number },
) {
  const sheet = await ensureCompetitionBudget(dbx, input.competitionId);
  const linked = sheet.lines.find((line) => line.sponsorId === input.sponsorId);
  if (linked) {
    requirePlanEditable(sheet.budget.status);
  }

  await dbx
    .delete(competitionSponsors)
    .where(
      and(
        eq(competitionSponsors.id, input.sponsorId),
        eq(competitionSponsors.competitionId, input.competitionId),
      ),
    );
  return ensureCompetitionBudget(dbx, input.competitionId);
}

export type { BudgetSpendStatus };
