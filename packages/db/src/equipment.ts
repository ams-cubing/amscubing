import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  like,
  lt,
  sql,
} from "drizzle-orm";
import { alias, type PgDatabase } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import type * as schema from "./schema";
import {
  competitions,
  equipmentAcquisitionLines,
  equipmentAcquisitions,
  equipmentEvents,
  equipmentItems,
  equipmentLoanLines,
  equipmentLoans,
  equipmentSkuCounters,
  equipmentStock,
  equipmentTypes,
  user,
  type EquipmentType,
} from "./schema";

import {
  EQUIPMENT_STATUS_LABELS,
  LENDABLE_STATUSES,
  REMOVAL_KINDS,
  RETURN_STATUSES,
  type EquipmentAcquisitionKind,
  type EquipmentCategory,
  type EquipmentEventAction,
  type EquipmentStatus,
  type EquipmentTracking,
  type LoanStatus,
} from "./equipment-labels";

export * from "./equipment-labels";

export type EquipmentDb = PgDatabase<PostgresJsQueryResultHKT, typeof schema>;

/** Expected failure whose message is safe to show to the user. */
export class EquipmentError extends Error {}

const MEXICO_TZ = "America/Mexico_City";

/** `YYYY-MM-DD` in Mexico City time. */
export function todayInMexico(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MEXICO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// ---------------------------------------------------------------------------
// SKU
// ---------------------------------------------------------------------------

const SKU_PATTERN = /^([A-Z0-9]+)-(\d{2})(\d{2,})$/;

/** `{PREFIX}-{YY}{NN}`, e.g. `DS3-2301`. The sequence grows past two digits. */
export function formatSku(prefix: string, year: number, sequence: number) {
  const yy = String(year % 100).padStart(2, "0");
  return `${prefix}-${yy}${String(sequence).padStart(2, "0")}`;
}

export function parseSku(
  sku: string,
): { prefix: string; year: number; sequence: number } | null {
  const match = SKU_PATTERN.exec(sku.trim().toUpperCase());
  if (!match) return null;
  return {
    prefix: match[1]!,
    year: 2000 + Number(match[2]),
    sequence: Number(match[3]),
  };
}

export function skuRange(
  prefix: string,
  year: number,
  start: number,
  count: number,
): string[] {
  return Array.from({ length: count }, (_, i) =>
    formatSku(prefix, year, start + i),
  );
}

/** Highest sequence used for `prefix` in `year` among `skus`, or 0. */
export function maxSkuSequence(
  skus: readonly string[],
  prefix: string,
  year: number,
): number {
  let max = 0;
  for (const sku of skus) {
    const parsed = parseSku(sku);
    if (!parsed || parsed.prefix !== prefix || parsed.year !== year) continue;
    if (parsed.sequence > max) max = parsed.sequence;
  }
  return max;
}

export function normalizeSkuPrefix(prefix: string) {
  return prefix.trim().toUpperCase();
}

/**
 * Reserves `count` consecutive SKUs for `prefix`/`year`. The counter never goes
 * below the highest SKU already stored, so legacy codes are never reused.
 */
export async function nextSkus(
  tx: EquipmentDb,
  prefix: string,
  count: number,
  year: number,
): Promise<string[]> {
  if (count <= 0) return [];
  const yy = String(year % 100).padStart(2, "0");
  const existing = await tx
    .select({ sku: equipmentItems.sku })
    .from(equipmentItems)
    .where(like(equipmentItems.sku, `${prefix}-${yy}%`));
  const floor =
    maxSkuSequence(
      existing.map((row) => row.sku),
      prefix,
      year,
    ) + 1;

  const [row] = await tx
    .insert(equipmentSkuCounters)
    .values({ prefix, year, next: floor + count })
    .onConflictDoUpdate({
      target: [equipmentSkuCounters.prefix, equipmentSkuCounters.year],
      set: {
        next: sql`greatest(${equipmentSkuCounters.next}, ${floor}) + ${count}`,
      },
    })
    .returning({ next: equipmentSkuCounters.next });

  return skuRange(prefix, year, row!.next - count, count);
}

/** Raises every counter to at least the highest stored SKU + 1 (after imports). */
export async function syncSkuCounters(tx: EquipmentDb) {
  const rows = await tx
    .select({ sku: equipmentItems.sku })
    .from(equipmentItems);
  const floors = new Map<
    string,
    { prefix: string; year: number; next: number }
  >();
  for (const { sku } of rows) {
    const parsed = parseSku(sku);
    if (!parsed) continue;
    const key = `${parsed.prefix}:${parsed.year}`;
    const next = parsed.sequence + 1;
    const current = floors.get(key);
    if (!current || current.next < next) {
      floors.set(key, { prefix: parsed.prefix, year: parsed.year, next });
    }
  }
  for (const floor of floors.values()) {
    await tx
      .insert(equipmentSkuCounters)
      .values(floor)
      .onConflictDoUpdate({
        target: [equipmentSkuCounters.prefix, equipmentSkuCounters.year],
        set: {
          next: sql`greatest(${equipmentSkuCounters.next}, ${floor.next})`,
        },
      });
  }
  return floors.size;
}

// ---------------------------------------------------------------------------
// Pure rules
// ---------------------------------------------------------------------------

type LoanLineProgress = { quantity: number; returnedQuantity: number };

export function isLineOpen(line: LoanLineProgress) {
  return line.returnedQuantity < line.quantity;
}

export function getLoanStatus(
  loan: { returnedAt: Date | null; dueAt: string | null },
  lines: readonly LoanLineProgress[],
  today: string,
): LoanStatus {
  if (loan.returnedAt || (lines.length > 0 && !lines.some(isLineOpen))) {
    return "returned";
  }
  if (loan.dueAt && loan.dueAt < today) return "overdue";
  if (lines.some((line) => line.returnedQuantity > 0 || !isLineOpen(line))) {
    return "partial";
  }
  return "active";
}

/** Bulk quantity a guardian can still lend or move. */
export function availableQuantity(stockQuantity: number, onLoan: number) {
  return Math.max(0, stockQuantity - onLoan);
}

export type LoanCandidateItem = {
  id: number;
  sku: string;
  guardianUserId: string | null;
  status: EquipmentStatus;
  onOpenLoan: boolean;
};

export function assertItemsLendable(
  items: readonly LoanCandidateItem[],
  lentByUserId: string,
) {
  for (const item of items) {
    if (item.guardianUserId !== lentByUserId) {
      throw new EquipmentError(
        `${item.sku} no está bajo resguardo del guardián que presta`,
      );
    }
    if (!LENDABLE_STATUSES.includes(item.status)) {
      throw new EquipmentError(
        `${item.sku} no se puede prestar (${EQUIPMENT_STATUS_LABELS[item.status]})`,
      );
    }
    if (item.onOpenLoan) {
      throw new EquipmentError(`${item.sku} ya está prestado`);
    }
  }
}

export function assertBulkAvailable(
  requested: number,
  available: number,
  typeName: string,
) {
  if (!Number.isInteger(requested) || requested <= 0) {
    throw new EquipmentError(`Cantidad inválida para ${typeName}`);
  }
  if (requested > available) {
    throw new EquipmentError(
      `Solo hay ${available} disponible(s) de ${typeName}`,
    );
  }
}

/** Functional units first, then by SKU, so auto-pick lends the best units. */
export function pickUnits<T extends { sku: string; status: EquipmentStatus }>(
  candidates: readonly T[],
  count: number,
): T[] {
  return [...candidates]
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "functional" ? -1 : 1;
      return a.sku.localeCompare(b.sku);
    })
    .slice(0, count);
}

function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
) {
  const changed: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of Object.keys(after)) {
    const next = after[key];
    if (next === undefined) continue;
    if (before[key] !== next) {
      changed[key] = { before: before[key], after: next };
    }
  }
  return changed;
}

// ---------------------------------------------------------------------------
// Internal reads used by mutations
// ---------------------------------------------------------------------------

async function getTypeOrThrow(tx: EquipmentDb, typeId: number) {
  const [type] = await tx
    .select()
    .from(equipmentTypes)
    .where(eq(equipmentTypes.id, typeId));
  if (!type) throw new EquipmentError("Tipo de equipo no encontrado");
  return type;
}

async function openLoanItemIds(tx: EquipmentDb, itemIds: number[]) {
  if (itemIds.length === 0) return new Set<number>();
  const rows = await tx
    .select({ itemId: equipmentLoanLines.itemId })
    .from(equipmentLoanLines)
    .where(
      and(
        inArray(equipmentLoanLines.itemId, itemIds),
        isNull(equipmentLoanLines.returnedAt),
      ),
    );
  return new Set(rows.map((row) => row.itemId!));
}

/** Bulk units of `typeId` currently lent out by `guardianUserId`. */
async function bulkOnLoan(
  tx: EquipmentDb,
  typeId: number,
  guardianUserId: string,
) {
  const [row] = await tx
    .select({
      total: sql<number>`coalesce(sum(${equipmentLoanLines.quantity} - ${equipmentLoanLines.returnedQuantity}), 0)::int`,
    })
    .from(equipmentLoanLines)
    .innerJoin(equipmentLoans, eq(equipmentLoans.id, equipmentLoanLines.loanId))
    .where(
      and(
        eq(equipmentLoanLines.typeId, typeId),
        isNull(equipmentLoanLines.itemId),
        eq(equipmentLoans.lentByUserId, guardianUserId),
        isNull(equipmentLoanLines.returnedAt),
      ),
    );
  return row?.total ?? 0;
}

async function stockQuantity(
  tx: EquipmentDb,
  typeId: number,
  guardianUserId: string,
) {
  const [row] = await tx
    .select({ quantity: equipmentStock.quantity })
    .from(equipmentStock)
    .where(
      and(
        eq(equipmentStock.typeId, typeId),
        eq(equipmentStock.guardianUserId, guardianUserId),
      ),
    )
    .for("update");
  return row?.quantity ?? 0;
}

async function changeStock(
  tx: EquipmentDb,
  typeId: number,
  guardianUserId: string,
  delta: number,
) {
  await tx
    .insert(equipmentStock)
    .values({ typeId, guardianUserId, quantity: delta })
    .onConflictDoUpdate({
      target: [equipmentStock.typeId, equipmentStock.guardianUserId],
      set: {
        quantity: sql`${equipmentStock.quantity} + ${delta}`,
        updatedAt: new Date(),
      },
    });
}

async function assertUserExists(tx: EquipmentDb, userId: string) {
  const [row] = await tx
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId));
  if (!row) throw new EquipmentError("Usuario no encontrado");
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type CreateTypeInput = {
  actorId: string;
  name: string;
  skuPrefix: string;
  category: EquipmentCategory;
  tracking: EquipmentTracking;
  sortOrder?: number;
};

export async function createEquipmentType(
  tx: EquipmentDb,
  input: CreateTypeInput,
) {
  const skuPrefix = normalizeSkuPrefix(input.skuPrefix);
  if (!/^[A-Z0-9]{2,6}$/.test(skuPrefix)) {
    throw new EquipmentError(
      "El prefijo debe tener de 2 a 6 letras o números (p. ej. DS3)",
    );
  }
  const [clash] = await tx
    .select({ id: equipmentTypes.id })
    .from(equipmentTypes)
    .where(eq(equipmentTypes.skuPrefix, skuPrefix));
  if (clash) throw new EquipmentError(`El prefijo ${skuPrefix} ya existe`);

  const [type] = await tx
    .insert(equipmentTypes)
    .values({
      name: input.name.trim(),
      skuPrefix,
      category: input.category,
      tracking: input.tracking,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return type!;
}

export type AcquisitionLineInput =
  | {
      /** Adds units (serialized) or quantity (bulk) to a guardian. */
      typeId: number;
      quantity: number;
      guardianUserId: string;
    }
  | {
      /** Removes specific serialized units. */
      typeId: number;
      itemIds: number[];
    }
  | {
      /** Removes bulk quantity from a guardian. */
      typeId: number;
      quantity: number;
      guardianUserId: string;
      remove: true;
    };

export type RegisterAcquisitionInput = {
  actorId: string;
  date: string;
  description: string;
  source: string;
  kind: EquipmentAcquisitionKind;
  lines: AcquisitionLineInput[];
  /** History-only entry (e.g. sheet import); doesn't touch units or stock. */
  ledgerOnly?: { typeId: number; quantityDelta: number }[];
};

export async function registerAcquisition(
  tx: EquipmentDb,
  input: RegisterAcquisitionInput,
): Promise<{ acquisitionId: number; createdSkus: string[] }> {
  const removal = REMOVAL_KINDS.includes(input.kind);
  if (!input.ledgerOnly && input.lines.length === 0) {
    throw new EquipmentError("Agrega al menos un renglón");
  }

  const [acquisition] = await tx
    .insert(equipmentAcquisitions)
    .values({
      date: input.date,
      description: input.description.trim(),
      source: input.source.trim(),
      kind: input.kind,
      createdByUserId: input.actorId,
    })
    .returning({ id: equipmentAcquisitions.id });
  const acquisitionId = acquisition!.id;

  if (input.ledgerOnly) {
    for (const line of input.ledgerOnly) {
      if (line.quantityDelta === 0) continue;
      await tx.insert(equipmentAcquisitionLines).values({
        acquisitionId,
        typeId: line.typeId,
        quantityDelta: line.quantityDelta,
      });
      await tx.insert(equipmentEvents).values({
        action: "acquisition_recorded",
        actorId: input.actorId,
        typeId: line.typeId,
        quantityDelta: line.quantityDelta,
        acquisitionId,
        details: { ledgerOnly: true, description: input.description },
      });
    }
    return { acquisitionId, createdSkus: [] };
  }

  const year = Number(input.date.slice(0, 4));
  const createdSkus: string[] = [];

  for (const line of input.lines) {
    const type = await getTypeOrThrow(tx, line.typeId);

    if ("itemIds" in line) {
      if (!removal) {
        throw new EquipmentError(
          "Solo una venta o baja puede retirar unidades",
        );
      }
      if (type.tracking !== "serialized") {
        throw new EquipmentError(`${type.name} se maneja por cantidad`);
      }
      const items = line.itemIds.length
        ? await tx
            .select()
            .from(equipmentItems)
            .where(inArray(equipmentItems.id, line.itemIds))
        : [];
      if (items.length !== line.itemIds.length || items.length === 0) {
        throw new EquipmentError(
          "Selecciona unidades válidas para dar de baja",
        );
      }
      const onLoan = await openLoanItemIds(tx, line.itemIds);
      for (const item of items) {
        if (item.typeId !== type.id) {
          throw new EquipmentError(`${item.sku} no es ${type.name}`);
        }
        if (item.status === "retired") {
          throw new EquipmentError(`${item.sku} ya está dado de baja`);
        }
        if (onLoan.has(item.id)) {
          throw new EquipmentError(`${item.sku} está prestado`);
        }
      }
      await tx
        .update(equipmentItems)
        .set({ status: "retired", updatedAt: new Date() })
        .where(inArray(equipmentItems.id, line.itemIds));
      await tx.insert(equipmentEvents).values(
        items.map((item) => ({
          action: "retired" as const,
          actorId: input.actorId,
          itemId: item.id,
          typeId: type.id,
          guardianUserId: item.guardianUserId,
          acquisitionId,
          details: {
            status: { before: item.status, after: "retired" },
            kind: input.kind,
          },
        })),
      );
      await tx.insert(equipmentAcquisitionLines).values({
        acquisitionId,
        typeId: type.id,
        quantityDelta: -items.length,
      });
      continue;
    }

    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new EquipmentError(`Cantidad inválida para ${type.name}`);
    }
    await assertUserExists(tx, line.guardianUserId);

    if ("remove" in line && !removal) {
      throw new EquipmentError("Solo una venta o baja puede retirar cantidad");
    }
    if (removal) {
      if (type.tracking === "serialized") {
        throw new EquipmentError(
          `Selecciona las unidades de ${type.name} que se dan de baja`,
        );
      }
      const quantity = await stockQuantity(tx, type.id, line.guardianUserId);
      const onLoan = await bulkOnLoan(tx, type.id, line.guardianUserId);
      assertBulkAvailable(
        line.quantity,
        availableQuantity(quantity, onLoan),
        type.name,
      );
      await changeStock(tx, type.id, line.guardianUserId, -line.quantity);
      await tx.insert(equipmentEvents).values({
        action: "stock_adjusted",
        actorId: input.actorId,
        typeId: type.id,
        guardianUserId: line.guardianUserId,
        quantityDelta: -line.quantity,
        acquisitionId,
        details: { kind: input.kind, reason: input.description },
      });
      await tx.insert(equipmentAcquisitionLines).values({
        acquisitionId,
        typeId: type.id,
        quantityDelta: -line.quantity,
      });
      continue;
    }

    if (type.tracking === "serialized") {
      const skus = await nextSkus(tx, type.skuPrefix, line.quantity, year);
      const created = await tx
        .insert(equipmentItems)
        .values(
          skus.map((sku) => ({
            sku,
            typeId: type.id,
            guardianUserId: line.guardianUserId,
            acquisitionId,
          })),
        )
        .returning({ id: equipmentItems.id, sku: equipmentItems.sku });
      await tx.insert(equipmentEvents).values(
        created.map((item) => ({
          action: "item_created" as const,
          actorId: input.actorId,
          itemId: item.id,
          typeId: type.id,
          guardianUserId: line.guardianUserId,
          toUserId: line.guardianUserId,
          acquisitionId,
          details: { sku: item.sku, source: input.source },
        })),
      );
      createdSkus.push(...created.map((item) => item.sku));
    } else {
      await changeStock(tx, type.id, line.guardianUserId, line.quantity);
      await tx.insert(equipmentEvents).values({
        action: "stock_adjusted",
        actorId: input.actorId,
        typeId: type.id,
        guardianUserId: line.guardianUserId,
        toUserId: line.guardianUserId,
        quantityDelta: line.quantity,
        acquisitionId,
        details: { kind: input.kind, source: input.source },
      });
    }

    await tx.insert(equipmentAcquisitionLines).values({
      acquisitionId,
      typeId: type.id,
      quantityDelta: line.quantity,
    });
  }

  await tx.insert(equipmentEvents).values({
    action: "acquisition_recorded",
    actorId: input.actorId,
    acquisitionId,
    details: {
      kind: input.kind,
      description: input.description,
      source: input.source,
      createdSkus,
    },
  });

  return { acquisitionId, createdSkus };
}

export async function updateItem(
  tx: EquipmentDb,
  input: {
    actorId: string;
    itemId: number;
    status?: EquipmentStatus;
    notes?: string | null;
  },
) {
  const [item] = await tx
    .select()
    .from(equipmentItems)
    .where(eq(equipmentItems.id, input.itemId))
    .for("update");
  if (!item) throw new EquipmentError("Unidad no encontrada");

  const notes =
    input.notes === undefined ? undefined : input.notes?.trim() || null;
  const changes = diffFields(
    { status: item.status, notes: item.notes },
    { status: input.status, notes },
  );
  if (Object.keys(changes).length === 0) return { changed: false };

  if (changes.status) {
    const onLoan = await openLoanItemIds(tx, [item.id]);
    if (onLoan.has(item.id) && input.status === "retired") {
      throw new EquipmentError("No se puede dar de baja una unidad prestada");
    }
  }

  await tx
    .update(equipmentItems)
    .set({
      ...(input.status ? { status: input.status } : {}),
      ...(notes !== undefined ? { notes } : {}),
      updatedAt: new Date(),
    })
    .where(eq(equipmentItems.id, item.id));

  await tx.insert(equipmentEvents).values({
    action: changes.status
      ? input.status === "retired"
        ? "retired"
        : "status_changed"
      : "item_updated",
    actorId: input.actorId,
    itemId: item.id,
    typeId: item.typeId,
    guardianUserId: item.guardianUserId,
    details: changes,
  });

  return { changed: true };
}

export async function transferItems(
  tx: EquipmentDb,
  input: {
    actorId: string;
    itemIds: number[];
    toUserId: string;
    note?: string;
  },
) {
  if (input.itemIds.length === 0) {
    throw new EquipmentError("Selecciona al menos una unidad");
  }
  await assertUserExists(tx, input.toUserId);

  const items = await tx
    .select()
    .from(equipmentItems)
    .where(inArray(equipmentItems.id, input.itemIds))
    .for("update");
  if (items.length !== input.itemIds.length) {
    throw new EquipmentError("Alguna unidad no existe");
  }
  const onLoan = await openLoanItemIds(tx, input.itemIds);
  const moving = items.filter((item) => item.guardianUserId !== input.toUserId);
  for (const item of moving) {
    if (item.status === "retired") {
      throw new EquipmentError(`${item.sku} está dado de baja`);
    }
    if (onLoan.has(item.id)) {
      throw new EquipmentError(`${item.sku} está prestado; regístralo primero`);
    }
  }
  if (moving.length === 0) return { moved: [] as typeof items };

  await tx
    .update(equipmentItems)
    .set({ guardianUserId: input.toUserId, updatedAt: new Date() })
    .where(
      inArray(
        equipmentItems.id,
        moving.map((item) => item.id),
      ),
    );
  await tx.insert(equipmentEvents).values(
    moving.map((item) => ({
      action: "transferred" as const,
      actorId: input.actorId,
      itemId: item.id,
      typeId: item.typeId,
      guardianUserId: input.toUserId,
      fromUserId: item.guardianUserId,
      toUserId: input.toUserId,
      details: input.note ? { note: input.note } : null,
    })),
  );
  return { moved: moving };
}

export async function transferStock(
  tx: EquipmentDb,
  input: {
    actorId: string;
    typeId: number;
    fromUserId: string;
    toUserId: string;
    quantity: number;
    note?: string;
  },
) {
  if (input.fromUserId === input.toUserId) {
    throw new EquipmentError("Elige un guardián distinto");
  }
  const type = await getTypeOrThrow(tx, input.typeId);
  if (type.tracking !== "bulk") {
    throw new EquipmentError(`${type.name} se transfiere por unidad`);
  }
  await assertUserExists(tx, input.toUserId);

  const quantity = await stockQuantity(tx, type.id, input.fromUserId);
  const onLoan = await bulkOnLoan(tx, type.id, input.fromUserId);
  assertBulkAvailable(
    input.quantity,
    availableQuantity(quantity, onLoan),
    type.name,
  );

  await changeStock(tx, type.id, input.fromUserId, -input.quantity);
  await changeStock(tx, type.id, input.toUserId, input.quantity);
  await tx.insert(equipmentEvents).values({
    action: "transferred",
    actorId: input.actorId,
    typeId: type.id,
    guardianUserId: input.toUserId,
    quantityDelta: input.quantity,
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    details: input.note ? { note: input.note } : null,
  });
  return { type };
}

export async function adjustStock(
  tx: EquipmentDb,
  input: {
    actorId: string;
    typeId: number;
    guardianUserId: string;
    delta: number;
    reason: string;
  },
) {
  const reason = input.reason.trim();
  if (!reason) throw new EquipmentError("Indica el motivo del ajuste");
  if (!Number.isInteger(input.delta) || input.delta === 0) {
    throw new EquipmentError("El ajuste debe ser un número distinto de cero");
  }
  const type = await getTypeOrThrow(tx, input.typeId);
  if (type.tracking !== "bulk") {
    throw new EquipmentError(`${type.name} se maneja por unidad`);
  }
  await assertUserExists(tx, input.guardianUserId);

  const quantity = await stockQuantity(tx, type.id, input.guardianUserId);
  const onLoan = await bulkOnLoan(tx, type.id, input.guardianUserId);
  if (quantity + input.delta < onLoan) {
    throw new EquipmentError(
      `No puedes dejar menos de ${onLoan} (prestados actualmente)`,
    );
  }

  await changeStock(tx, type.id, input.guardianUserId, input.delta);
  await tx.insert(equipmentEvents).values({
    action: "stock_adjusted",
    actorId: input.actorId,
    typeId: type.id,
    guardianUserId: input.guardianUserId,
    quantityDelta: input.delta,
    details: { reason, before: quantity, after: quantity + input.delta },
  });
}

export async function setStockNotes(
  tx: EquipmentDb,
  input: {
    actorId: string;
    typeId: number;
    guardianUserId: string;
    notes: string;
  },
) {
  const [row] = await tx
    .select()
    .from(equipmentStock)
    .where(
      and(
        eq(equipmentStock.typeId, input.typeId),
        eq(equipmentStock.guardianUserId, input.guardianUserId),
      ),
    );
  if (!row) throw new EquipmentError("Registro de cantidad no encontrado");
  const notes = input.notes.trim() || null;
  if (row.notes === notes) return;

  await tx
    .update(equipmentStock)
    .set({ notes, updatedAt: new Date() })
    .where(eq(equipmentStock.id, row.id));
  await tx.insert(equipmentEvents).values({
    action: "item_updated",
    actorId: input.actorId,
    typeId: input.typeId,
    guardianUserId: input.guardianUserId,
    details: { notes: { before: row.notes, after: notes } },
  });
}

export type CreateLoanInput = {
  actorId: string;
  borrowerUserId: string;
  lentByUserId: string;
  competitionId?: number | null;
  reason: string;
  loanedAt: string;
  dueAt?: string | null;
  notes?: string | null;
  itemIds?: number[];
  /** Serialized types: lend N units chosen automatically from the lender. */
  autoPick?: { typeId: number; quantity: number }[];
  bulk?: { typeId: number; quantity: number }[];
};

export async function createLoan(
  tx: EquipmentDb,
  input: CreateLoanInput,
): Promise<{ loanId: number; summary: string }> {
  const reason = input.reason.trim();
  if (!reason) throw new EquipmentError("Indica la razón del préstamo");
  if (input.borrowerUserId === input.lentByUserId) {
    throw new EquipmentError(
      "El guardián no puede prestarse equipo a sí mismo",
    );
  }
  if (input.dueAt && input.dueAt < input.loanedAt) {
    throw new EquipmentError(
      "La fecha tentativa de devolución no puede ser antes del préstamo",
    );
  }
  await assertUserExists(tx, input.borrowerUserId);
  await assertUserExists(tx, input.lentByUserId);

  const itemIds = new Set(input.itemIds ?? []);

  for (const pick of input.autoPick ?? []) {
    if (pick.quantity <= 0) continue;
    const type = await getTypeOrThrow(tx, pick.typeId);
    if (type.tracking !== "serialized") {
      throw new EquipmentError(`${type.name} se presta por cantidad`);
    }
    const candidates = await tx
      .select({
        id: equipmentItems.id,
        sku: equipmentItems.sku,
        status: equipmentItems.status,
      })
      .from(equipmentItems)
      .where(
        and(
          eq(equipmentItems.typeId, type.id),
          eq(equipmentItems.guardianUserId, input.lentByUserId),
          inArray(equipmentItems.status, [...LENDABLE_STATUSES]),
        ),
      );
    const busy = await openLoanItemIds(
      tx,
      candidates.map((c) => c.id),
    );
    const free = candidates.filter(
      (c) => !busy.has(c.id) && !itemIds.has(c.id),
    );
    if (free.length < pick.quantity) {
      throw new EquipmentError(
        `Solo hay ${free.length} ${type.name} disponible(s) con ese guardián`,
      );
    }
    for (const unit of pickUnits(free, pick.quantity)) itemIds.add(unit.id);
  }

  const ids = [...itemIds];
  const items = ids.length
    ? await tx
        .select()
        .from(equipmentItems)
        .where(inArray(equipmentItems.id, ids))
        .for("update")
    : [];
  if (items.length !== ids.length) {
    throw new EquipmentError("Alguna unidad no existe");
  }
  const busy = await openLoanItemIds(tx, ids);
  assertItemsLendable(
    items.map((item) => ({ ...item, onOpenLoan: busy.has(item.id) })),
    input.lentByUserId,
  );

  const bulk = (input.bulk ?? []).filter((line) => line.quantity > 0);
  const bulkTypes = new Map<number, EquipmentType>();
  for (const line of bulk) {
    const type = await getTypeOrThrow(tx, line.typeId);
    if (type.tracking !== "bulk") {
      throw new EquipmentError(`${type.name} se presta por unidad`);
    }
    if (bulkTypes.has(type.id)) {
      throw new EquipmentError(`${type.name} aparece dos veces`);
    }
    const quantity = await stockQuantity(tx, type.id, input.lentByUserId);
    const onLoan = await bulkOnLoan(tx, type.id, input.lentByUserId);
    assertBulkAvailable(
      line.quantity,
      availableQuantity(quantity, onLoan),
      type.name,
    );
    bulkTypes.set(type.id, type);
  }

  if (items.length === 0 && bulk.length === 0) {
    throw new EquipmentError("Agrega al menos un equipo al préstamo");
  }

  const [loan] = await tx
    .insert(equipmentLoans)
    .values({
      borrowerUserId: input.borrowerUserId,
      lentByUserId: input.lentByUserId,
      competitionId: input.competitionId ?? null,
      reason,
      loanedAt: input.loanedAt,
      dueAt: input.dueAt || null,
      notes: input.notes?.trim() || null,
    })
    .returning({ id: equipmentLoans.id });
  const loanId = loan!.id;

  if (items.length) {
    await tx.insert(equipmentLoanLines).values(
      items.map((item) => ({
        loanId,
        typeId: item.typeId,
        itemId: item.id,
        quantity: 1,
      })),
    );
  }
  if (bulk.length) {
    await tx.insert(equipmentLoanLines).values(
      bulk.map((line) => ({
        loanId,
        typeId: line.typeId,
        quantity: line.quantity,
      })),
    );
  }

  await tx.insert(equipmentEvents).values([
    ...items.map((item) => ({
      action: "loaned" as const,
      actorId: input.actorId,
      itemId: item.id,
      typeId: item.typeId,
      guardianUserId: input.lentByUserId,
      loanId,
      fromUserId: input.lentByUserId,
      toUserId: input.borrowerUserId,
      details: { sku: item.sku },
    })),
    ...bulk.map((line) => ({
      action: "loaned" as const,
      actorId: input.actorId,
      typeId: line.typeId,
      guardianUserId: input.lentByUserId,
      quantityDelta: line.quantity,
      loanId,
      fromUserId: input.lentByUserId,
      toUserId: input.borrowerUserId,
    })),
  ]);

  const summary = await describeLoan(tx, loanId);
  return { loanId, summary };
}

export type ReturnLoanInput = {
  actorId: string;
  loanId: number;
  items?: { lineId: number; status: EquipmentStatus }[];
  bulk?: { lineId: number; returned: number; lost?: number }[];
};

export async function returnLoanLines(
  tx: EquipmentDb,
  input: ReturnLoanInput,
): Promise<{ closed: boolean; borrowerUserId: string; summary: string }> {
  const [loan] = await tx
    .select()
    .from(equipmentLoans)
    .where(eq(equipmentLoans.id, input.loanId))
    .for("update");
  if (!loan) throw new EquipmentError("Préstamo no encontrado");
  if (loan.returnedAt) throw new EquipmentError("El préstamo ya fue devuelto");

  const lines = await tx
    .select()
    .from(equipmentLoanLines)
    .where(eq(equipmentLoanLines.loanId, loan.id));
  const byId = new Map(lines.map((line) => [line.id, line]));
  const now = new Date();
  let touched = 0;

  for (const entry of input.items ?? []) {
    const line = byId.get(entry.lineId);
    if (!line || line.itemId == null) {
      throw new EquipmentError("Renglón de préstamo inválido");
    }
    if (!isLineOpen(line)) continue;
    if (!RETURN_STATUSES.includes(entry.status)) {
      throw new EquipmentError("Estado de devolución inválido");
    }
    const [item] = await tx
      .select()
      .from(equipmentItems)
      .where(eq(equipmentItems.id, line.itemId));

    await tx
      .update(equipmentLoanLines)
      .set({ returnedQuantity: 1, returnedAt: now, returnStatus: entry.status })
      .where(eq(equipmentLoanLines.id, line.id));
    await tx
      .update(equipmentItems)
      .set({ status: entry.status, updatedAt: now })
      .where(eq(equipmentItems.id, line.itemId));
    await tx.insert(equipmentEvents).values({
      action: "returned",
      actorId: input.actorId,
      itemId: line.itemId,
      typeId: line.typeId,
      guardianUserId: loan.lentByUserId,
      loanId: loan.id,
      fromUserId: loan.borrowerUserId,
      toUserId: loan.lentByUserId,
      details: {
        sku: item?.sku,
        status: { before: item?.status, after: entry.status },
      },
    });
    line.returnedQuantity = 1;
    touched++;
  }

  for (const entry of input.bulk ?? []) {
    const line = byId.get(entry.lineId);
    if (!line || line.itemId != null) {
      throw new EquipmentError("Renglón de préstamo inválido");
    }
    const returned = entry.returned || 0;
    const lost = entry.lost || 0;
    if (returned < 0 || lost < 0 || !Number.isInteger(returned + lost)) {
      throw new EquipmentError("Cantidad de devolución inválida");
    }
    if (returned + lost === 0) continue;
    const pending = line.quantity - line.returnedQuantity;
    if (returned + lost > pending) {
      throw new EquipmentError(
        `Solo quedan ${pending} pendientes en un renglón`,
      );
    }
    const nextReturned = line.returnedQuantity + returned + lost;
    const closes = nextReturned === line.quantity;

    await tx
      .update(equipmentLoanLines)
      .set({
        returnedQuantity: nextReturned,
        returnedAt: closes ? now : null,
      })
      .where(eq(equipmentLoanLines.id, line.id));

    if (lost > 0) {
      await changeStock(tx, line.typeId, loan.lentByUserId, -lost);
      await tx.insert(equipmentEvents).values({
        action: "stock_adjusted",
        actorId: input.actorId,
        typeId: line.typeId,
        guardianUserId: loan.lentByUserId,
        quantityDelta: -lost,
        loanId: loan.id,
        details: { reason: "Extraviado durante préstamo" },
      });
    }
    await tx.insert(equipmentEvents).values({
      action: "returned",
      actorId: input.actorId,
      typeId: line.typeId,
      guardianUserId: loan.lentByUserId,
      quantityDelta: returned,
      loanId: loan.id,
      fromUserId: loan.borrowerUserId,
      toUserId: loan.lentByUserId,
      details: lost > 0 ? { lost } : null,
    });
    line.returnedQuantity = nextReturned;
    touched++;
  }

  if (touched === 0) {
    throw new EquipmentError("Marca al menos un equipo como devuelto");
  }

  const closed = !lines.some(isLineOpen);
  if (closed) {
    await tx
      .update(equipmentLoans)
      .set({ returnedAt: now })
      .where(eq(equipmentLoans.id, loan.id));
  }

  return {
    closed,
    borrowerUserId: loan.borrowerUserId,
    summary: await describeLoan(tx, loan.id),
  };
}

/** Human summary like "8 Timer SpeedStack G4, 12 Cronómetro de mano". */
export async function describeLoan(tx: EquipmentDb, loanId: number) {
  const rows = await tx
    .select({
      name: equipmentTypes.name,
      quantity: sql<number>`sum(${equipmentLoanLines.quantity})::int`,
    })
    .from(equipmentLoanLines)
    .innerJoin(equipmentTypes, eq(equipmentTypes.id, equipmentLoanLines.typeId))
    .where(eq(equipmentLoanLines.loanId, loanId))
    .groupBy(equipmentTypes.name, equipmentTypes.sortOrder)
    .orderBy(asc(equipmentTypes.sortOrder), asc(equipmentTypes.name));
  return rows.map((row) => `${row.quantity} ${row.name}`).join(", ");
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export type EquipmentPerson = {
  id: string;
  name: string;
  wcaId: string | null;
  image: string | null;
};

const personColumns = {
  id: user.id,
  name: user.name,
  wcaId: user.wcaId,
  image: user.image,
};

export async function listEquipmentTypes(dbx: EquipmentDb) {
  return dbx
    .select()
    .from(equipmentTypes)
    .where(isNull(equipmentTypes.archivedAt))
    .orderBy(asc(equipmentTypes.sortOrder), asc(equipmentTypes.name));
}

/** Delegates who can act as guardians. */
export async function listEquipmentGuardians(
  dbx: EquipmentDb,
): Promise<EquipmentPerson[]> {
  return dbx
    .select(personColumns)
    .from(user)
    .where(eq(user.role, "delegate"))
    .orderBy(asc(user.name));
}

export type EquipmentItemRow = {
  id: number;
  sku: string;
  typeId: number;
  typeName: string;
  category: EquipmentCategory;
  status: EquipmentStatus;
  notes: string | null;
  guardian: EquipmentPerson | null;
  source: string | null;
  onLoanId: number | null;
};

export async function listEquipmentItems(
  dbx: EquipmentDb,
  filter: {
    guardianUserId?: string;
    sku?: string;
    includeRetired?: boolean;
  } = {},
): Promise<EquipmentItemRow[]> {
  const conditions = [];
  if (filter.guardianUserId) {
    conditions.push(eq(equipmentItems.guardianUserId, filter.guardianUserId));
  }
  if (filter.sku) {
    conditions.push(eq(equipmentItems.sku, filter.sku.trim().toUpperCase()));
  }
  if (!filter.includeRetired) {
    conditions.push(sql`${equipmentItems.status} <> 'retired'`);
  }

  const rows = await dbx
    .select({
      id: equipmentItems.id,
      sku: equipmentItems.sku,
      typeId: equipmentItems.typeId,
      typeName: equipmentTypes.name,
      category: equipmentTypes.category,
      status: equipmentItems.status,
      notes: equipmentItems.notes,
      guardianId: user.id,
      guardianName: user.name,
      guardianWcaId: user.wcaId,
      guardianImage: user.image,
      source: equipmentAcquisitions.source,
      onLoanId: sql<number | null>`(
        select ${equipmentLoanLines.loanId} from ${equipmentLoanLines}
        where ${equipmentLoanLines.itemId} = ${equipmentItems.id}
          and ${equipmentLoanLines.returnedAt} is null
        limit 1
      )`,
    })
    .from(equipmentItems)
    .innerJoin(equipmentTypes, eq(equipmentTypes.id, equipmentItems.typeId))
    .leftJoin(user, eq(user.id, equipmentItems.guardianUserId))
    .leftJoin(
      equipmentAcquisitions,
      eq(equipmentAcquisitions.id, equipmentItems.acquisitionId),
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(equipmentTypes.sortOrder), asc(equipmentItems.sku));

  return rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    typeId: row.typeId,
    typeName: row.typeName,
    category: row.category,
    status: row.status,
    notes: row.notes,
    guardian: row.guardianId
      ? {
          id: row.guardianId,
          name: row.guardianName!,
          wcaId: row.guardianWcaId,
          image: row.guardianImage,
        }
      : null,
    source: row.source,
    onLoanId: row.onLoanId,
  }));
}

export type EquipmentStockRow = {
  typeId: number;
  typeName: string;
  category: EquipmentCategory;
  quantity: number;
  onLoan: number;
  notes: string | null;
  guardian: EquipmentPerson;
};

export async function listEquipmentStock(
  dbx: EquipmentDb,
  filter: { guardianUserId?: string } = {},
): Promise<EquipmentStockRow[]> {
  const rows = await dbx
    .select({
      typeId: equipmentStock.typeId,
      typeName: equipmentTypes.name,
      category: equipmentTypes.category,
      quantity: equipmentStock.quantity,
      notes: equipmentStock.notes,
      guardianId: user.id,
      guardianName: user.name,
      guardianWcaId: user.wcaId,
      guardianImage: user.image,
      onLoan: sql<number>`coalesce((
        select sum(${equipmentLoanLines.quantity} - ${equipmentLoanLines.returnedQuantity})
        from ${equipmentLoanLines}
        inner join ${equipmentLoans} on ${equipmentLoans.id} = ${equipmentLoanLines.loanId}
        where ${equipmentLoanLines.typeId} = ${equipmentStock.typeId}
          and ${equipmentLoanLines.itemId} is null
          and ${equipmentLoanLines.returnedAt} is null
          and ${equipmentLoans.lentByUserId} = ${equipmentStock.guardianUserId}
      ), 0)::int`,
    })
    .from(equipmentStock)
    .innerJoin(equipmentTypes, eq(equipmentTypes.id, equipmentStock.typeId))
    .innerJoin(user, eq(user.id, equipmentStock.guardianUserId))
    .where(
      filter.guardianUserId
        ? eq(equipmentStock.guardianUserId, filter.guardianUserId)
        : undefined,
    )
    .orderBy(asc(equipmentTypes.sortOrder), asc(equipmentTypes.name));

  return rows
    .filter((row) => row.quantity > 0 || row.onLoan > 0 || row.notes)
    .map((row) => ({
      typeId: row.typeId,
      typeName: row.typeName,
      category: row.category,
      quantity: row.quantity,
      onLoan: row.onLoan,
      notes: row.notes,
      guardian: {
        id: row.guardianId,
        name: row.guardianName,
        wcaId: row.guardianWcaId,
        image: row.guardianImage,
      },
    }));
}

export type InventorySummaryRow = {
  type: EquipmentType;
  total: number;
  available: number;
  onLoan: number;
  faulty: number;
  inRepair: number;
  lost: number;
};

/** Totals per type ("Total de equipo y accesorios"). Lost/retired units don't count toward total. */
export function summarizeInventory(
  types: readonly EquipmentType[],
  items: readonly EquipmentItemRow[],
  stock: readonly EquipmentStockRow[],
): InventorySummaryRow[] {
  return types.map((type) => {
    const row: InventorySummaryRow = {
      type,
      total: 0,
      available: 0,
      onLoan: 0,
      faulty: 0,
      inRepair: 0,
      lost: 0,
    };
    if (type.tracking === "serialized") {
      for (const item of items) {
        if (item.typeId !== type.id || item.status === "retired") continue;
        if (item.status === "lost") {
          row.lost++;
          continue;
        }
        row.total++;
        if (item.status === "faulty") row.faulty++;
        if (item.status === "in_repair") row.inRepair++;
        if (item.onLoanId != null) row.onLoan++;
        else if (item.status !== "in_repair") row.available++;
      }
    } else {
      for (const entry of stock) {
        if (entry.typeId !== type.id) continue;
        row.total += entry.quantity;
        row.onLoan += entry.onLoan;
        row.available += availableQuantity(entry.quantity, entry.onLoan);
      }
    }
    return row;
  });
}

export type GuardianInventory = {
  guardian: EquipmentPerson;
  items: EquipmentItemRow[];
  stock: EquipmentStockRow[];
};

export function groupByGuardian(
  items: readonly EquipmentItemRow[],
  stock: readonly EquipmentStockRow[],
): GuardianInventory[] {
  const groups = new Map<string, GuardianInventory>();
  const ensure = (guardian: EquipmentPerson) => {
    let group = groups.get(guardian.id);
    if (!group) {
      group = { guardian, items: [], stock: [] };
      groups.set(guardian.id, group);
    }
    return group;
  };
  for (const item of items) {
    if (item.guardian) ensure(item.guardian).items.push(item);
  }
  for (const entry of stock) ensure(entry.guardian).stock.push(entry);
  return [...groups.values()].sort((a, b) =>
    a.guardian.name.localeCompare(b.guardian.name, "es"),
  );
}

export type EquipmentEventRow = {
  id: number;
  action: EquipmentEventAction;
  createdAt: Date;
  actor: { id: string; name: string };
  sku: string | null;
  typeName: string | null;
  quantityDelta: number | null;
  loanId: number | null;
  acquisitionId: number | null;
  guardianName: string | null;
  fromName: string | null;
  toName: string | null;
  details: unknown;
};

export async function listEquipmentEvents(
  dbx: EquipmentDb,
  filter: {
    itemId?: number;
    loanId?: number;
    actorId?: string;
    guardianUserId?: string;
    action?: EquipmentEventAction;
    limit?: number;
  } = {},
): Promise<EquipmentEventRow[]> {
  const actor = alias(user, "actor");
  const guardian = alias(user, "guardian");
  const fromUser = alias(user, "from_user");
  const toUser = alias(user, "to_user");

  const conditions = [];
  if (filter.itemId) conditions.push(eq(equipmentEvents.itemId, filter.itemId));
  if (filter.loanId) conditions.push(eq(equipmentEvents.loanId, filter.loanId));
  if (filter.actorId) {
    conditions.push(eq(equipmentEvents.actorId, filter.actorId));
  }
  if (filter.guardianUserId) {
    conditions.push(eq(equipmentEvents.guardianUserId, filter.guardianUserId));
  }
  if (filter.action) conditions.push(eq(equipmentEvents.action, filter.action));

  const rows = await dbx
    .select({
      id: equipmentEvents.id,
      action: equipmentEvents.action,
      createdAt: equipmentEvents.createdAt,
      actorId: actor.id,
      actorName: actor.name,
      sku: equipmentItems.sku,
      typeName: equipmentTypes.name,
      quantityDelta: equipmentEvents.quantityDelta,
      loanId: equipmentEvents.loanId,
      acquisitionId: equipmentEvents.acquisitionId,
      guardianName: guardian.name,
      fromName: fromUser.name,
      toName: toUser.name,
      details: equipmentEvents.details,
    })
    .from(equipmentEvents)
    .innerJoin(actor, eq(actor.id, equipmentEvents.actorId))
    .leftJoin(equipmentItems, eq(equipmentItems.id, equipmentEvents.itemId))
    .leftJoin(equipmentTypes, eq(equipmentTypes.id, equipmentEvents.typeId))
    .leftJoin(guardian, eq(guardian.id, equipmentEvents.guardianUserId))
    .leftJoin(fromUser, eq(fromUser.id, equipmentEvents.fromUserId))
    .leftJoin(toUser, eq(toUser.id, equipmentEvents.toUserId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(equipmentEvents.createdAt), desc(equipmentEvents.id))
    .limit(filter.limit ?? 300);

  return rows.map(({ actorId, actorName, ...row }) => ({
    ...row,
    actor: { id: actorId, name: actorName },
  }));
}

export async function getEquipmentItemBySku(dbx: EquipmentDb, sku: string) {
  const [item] = await listEquipmentItems(dbx, { sku, includeRetired: true });
  if (!item) return null;

  const [extra] = await dbx
    .select({
      acquisitionId: equipmentItems.acquisitionId,
      acquisitionDescription: equipmentAcquisitions.description,
      acquisitionDate: equipmentAcquisitions.date,
      createdAt: equipmentItems.createdAt,
    })
    .from(equipmentItems)
    .leftJoin(
      equipmentAcquisitions,
      eq(equipmentAcquisitions.id, equipmentItems.acquisitionId),
    )
    .where(eq(equipmentItems.id, item.id));

  const loans = await dbx
    .select({
      loanId: equipmentLoans.id,
      loanedAt: equipmentLoans.loanedAt,
      dueAt: equipmentLoans.dueAt,
      reason: equipmentLoans.reason,
      borrowerName: user.name,
      lineReturnedAt: equipmentLoanLines.returnedAt,
      returnStatus: equipmentLoanLines.returnStatus,
    })
    .from(equipmentLoanLines)
    .innerJoin(equipmentLoans, eq(equipmentLoans.id, equipmentLoanLines.loanId))
    .innerJoin(user, eq(user.id, equipmentLoans.borrowerUserId))
    .where(eq(equipmentLoanLines.itemId, item.id))
    .orderBy(desc(equipmentLoans.loanedAt), desc(equipmentLoans.id));

  const events = await listEquipmentEvents(dbx, { itemId: item.id });

  return { item, ...extra!, loans, events };
}

export type EquipmentLoanLineRow = {
  id: number;
  typeId: number;
  typeName: string;
  itemId: number | null;
  sku: string | null;
  quantity: number;
  returnedQuantity: number;
  returnedAt: Date | null;
  returnStatus: EquipmentStatus | null;
};

export type EquipmentLoanRow = {
  id: number;
  reason: string;
  notes: string | null;
  loanedAt: string;
  dueAt: string | null;
  returnedAt: Date | null;
  createdAt: Date;
  status: LoanStatus;
  borrower: EquipmentPerson;
  lentBy: EquipmentPerson;
  competition: { id: number; name: string | null; city: string } | null;
  lines: EquipmentLoanLineRow[];
  summary: string;
};

function summarizeLines(lines: readonly EquipmentLoanLineRow[]) {
  const totals = new Map<string, number>();
  for (const line of lines) {
    totals.set(line.typeName, (totals.get(line.typeName) ?? 0) + line.quantity);
  }
  return [...totals].map(([name, qty]) => `${qty} ${name}`).join(", ");
}

export async function listEquipmentLoans(
  dbx: EquipmentDb,
  filter: { borrowerUserId?: string; loanId?: number; openOnly?: boolean } = {},
): Promise<EquipmentLoanRow[]> {
  const borrower = alias(user, "borrower");
  const lender = alias(user, "lender");

  const conditions = [];
  if (filter.borrowerUserId) {
    conditions.push(eq(equipmentLoans.borrowerUserId, filter.borrowerUserId));
  }
  if (filter.loanId) conditions.push(eq(equipmentLoans.id, filter.loanId));
  if (filter.openOnly) conditions.push(isNull(equipmentLoans.returnedAt));

  const loans = await dbx
    .select({
      id: equipmentLoans.id,
      reason: equipmentLoans.reason,
      notes: equipmentLoans.notes,
      loanedAt: equipmentLoans.loanedAt,
      dueAt: equipmentLoans.dueAt,
      returnedAt: equipmentLoans.returnedAt,
      createdAt: equipmentLoans.createdAt,
      borrowerId: borrower.id,
      borrowerName: borrower.name,
      borrowerWcaId: borrower.wcaId,
      borrowerImage: borrower.image,
      lenderId: lender.id,
      lenderName: lender.name,
      lenderWcaId: lender.wcaId,
      lenderImage: lender.image,
      competitionId: competitions.id,
      competitionName: competitions.name,
      competitionCity: competitions.city,
    })
    .from(equipmentLoans)
    .innerJoin(borrower, eq(borrower.id, equipmentLoans.borrowerUserId))
    .innerJoin(lender, eq(lender.id, equipmentLoans.lentByUserId))
    .leftJoin(competitions, eq(competitions.id, equipmentLoans.competitionId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(equipmentLoans.loanedAt), desc(equipmentLoans.id));

  if (loans.length === 0) return [];

  const lines = await dbx
    .select({
      id: equipmentLoanLines.id,
      loanId: equipmentLoanLines.loanId,
      typeId: equipmentLoanLines.typeId,
      typeName: equipmentTypes.name,
      sortOrder: equipmentTypes.sortOrder,
      itemId: equipmentLoanLines.itemId,
      sku: equipmentItems.sku,
      quantity: equipmentLoanLines.quantity,
      returnedQuantity: equipmentLoanLines.returnedQuantity,
      returnedAt: equipmentLoanLines.returnedAt,
      returnStatus: equipmentLoanLines.returnStatus,
    })
    .from(equipmentLoanLines)
    .innerJoin(equipmentTypes, eq(equipmentTypes.id, equipmentLoanLines.typeId))
    .leftJoin(equipmentItems, eq(equipmentItems.id, equipmentLoanLines.itemId))
    .where(
      inArray(
        equipmentLoanLines.loanId,
        loans.map((loan) => loan.id),
      ),
    )
    .orderBy(
      asc(equipmentTypes.sortOrder),
      asc(equipmentTypes.name),
      asc(equipmentItems.sku),
    );

  const today = todayInMexico();
  return loans.map((loan) => {
    const loanLines: EquipmentLoanLineRow[] = lines
      .filter((line) => line.loanId === loan.id)
      .map((line) => ({
        id: line.id,
        typeId: line.typeId,
        typeName: line.typeName,
        itemId: line.itemId,
        sku: line.sku,
        quantity: line.quantity,
        returnedQuantity: line.returnedQuantity,
        returnedAt: line.returnedAt,
        returnStatus: line.returnStatus,
      }));
    return {
      id: loan.id,
      reason: loan.reason,
      notes: loan.notes,
      loanedAt: loan.loanedAt,
      dueAt: loan.dueAt,
      returnedAt: loan.returnedAt,
      createdAt: loan.createdAt,
      status: getLoanStatus(loan, loanLines, today),
      borrower: {
        id: loan.borrowerId,
        name: loan.borrowerName,
        wcaId: loan.borrowerWcaId,
        image: loan.borrowerImage,
      },
      lentBy: {
        id: loan.lenderId,
        name: loan.lenderName,
        wcaId: loan.lenderWcaId,
        image: loan.lenderImage,
      },
      competition: loan.competitionId
        ? {
            id: loan.competitionId,
            name: loan.competitionName,
            city: loan.competitionCity!,
          }
        : null,
      lines: loanLines,
      summary: summarizeLines(loanLines),
    };
  });
}

export async function getEquipmentLoan(dbx: EquipmentDb, loanId: number) {
  const [loan] = await listEquipmentLoans(dbx, { loanId });
  return loan ?? null;
}

export type EquipmentAcquisitionRow = {
  id: number;
  date: string;
  description: string;
  source: string;
  kind: EquipmentAcquisitionKind;
  createdByName: string | null;
  lines: {
    typeId: number;
    typeName: string;
    skuPrefix: string;
    quantityDelta: number;
  }[];
};

export async function listEquipmentAcquisitions(
  dbx: EquipmentDb,
): Promise<EquipmentAcquisitionRow[]> {
  const acquisitions = await dbx
    .select({
      id: equipmentAcquisitions.id,
      date: equipmentAcquisitions.date,
      description: equipmentAcquisitions.description,
      source: equipmentAcquisitions.source,
      kind: equipmentAcquisitions.kind,
      createdByName: user.name,
    })
    .from(equipmentAcquisitions)
    .leftJoin(user, eq(user.id, equipmentAcquisitions.createdByUserId))
    .orderBy(desc(equipmentAcquisitions.date), desc(equipmentAcquisitions.id));
  if (acquisitions.length === 0) return [];

  const lines = await dbx
    .select({
      acquisitionId: equipmentAcquisitionLines.acquisitionId,
      typeId: equipmentAcquisitionLines.typeId,
      typeName: equipmentTypes.name,
      skuPrefix: equipmentTypes.skuPrefix,
      quantityDelta: equipmentAcquisitionLines.quantityDelta,
    })
    .from(equipmentAcquisitionLines)
    .innerJoin(
      equipmentTypes,
      eq(equipmentTypes.id, equipmentAcquisitionLines.typeId),
    )
    .orderBy(asc(equipmentTypes.sortOrder));

  return acquisitions.map((acquisition) => ({
    ...acquisition,
    lines: lines
      .filter((line) => line.acquisitionId === acquisition.id)
      .map((line) => ({
        typeId: line.typeId,
        typeName: line.typeName,
        skuPrefix: line.skuPrefix,
        quantityDelta: line.quantityDelta,
      })),
  }));
}

/** Open loans whose due date has passed. */
export async function countOverdueLoans(dbx: EquipmentDb) {
  const [row] = await dbx
    .select({ total: sql<number>`count(*)::int` })
    .from(equipmentLoans)
    .where(
      and(
        isNull(equipmentLoans.returnedAt),
        lt(equipmentLoans.dueAt, todayInMexico()),
      ),
    );
  return row?.total ?? 0;
}
