import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lt,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias, type PgDatabase } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import type * as schema from "./schema";
import {
  competitionDelegates,
  competitionOrganizers,
  competitions,
  equipmentAcquisitionLines,
  equipmentAcquisitions,
  equipmentConfirmationLines,
  equipmentEvents,
  equipmentItems,
  equipmentLoanLines,
  equipmentLoans,
  equipmentRequestLines,
  equipmentRequests,
  equipmentSkuCounters,
  equipmentStock,
  equipmentTypes,
  states,
  user,
  type EquipmentType,
} from "./schema";

import {
  EDITABLE_REQUEST_STATUSES,
  EQUIPMENT_STATUS_LABELS,
  LENDABLE_STATUSES,
  ORGANIZER_REQUEST_CATEGORIES,
  REMOVAL_KINDS,
  RETURN_STATUSES,
  type EquipmentAcquisitionKind,
  type EquipmentCategory,
  type EquipmentEventAction,
  type EquipmentRequestStatus,
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
  /** Competition the unit is confirmed for, while that reservation is active. */
  reservedFor: string | null;
};

function assertUnitFree(item: {
  sku: string;
  onOpenLoan: boolean;
  reservedFor: string | null;
}) {
  if (item.onOpenLoan) {
    throw new EquipmentError(`${item.sku} ya está prestado`);
  }
  if (item.reservedFor) {
    throw new EquipmentError(
      `${item.sku} está reservada para ${item.reservedFor}`,
    );
  }
}

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
    assertUnitFree(item);
  }
}

/** Units a delegate can confirm for a competition: same rules as lending, any guardian. */
export function assertItemsConfirmable(items: readonly LoanCandidateItem[]) {
  for (const item of items) {
    if (!item.guardianUserId) {
      throw new EquipmentError(`${item.sku} no tiene guardián`);
    }
    if (!LENDABLE_STATUSES.includes(item.status)) {
      throw new EquipmentError(
        `${item.sku} no se puede llevar (${EQUIPMENT_STATUS_LABELS[item.status]})`,
      );
    }
    assertUnitFree(item);
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

export type EquipmentRequestLineInput = { typeId: number; quantity: number };

const MAX_REQUEST_QUANTITY = 999;

/** Drops empty rows and rejects invalid or repeated types. */
export function normalizeRequestLines(
  lines: readonly EquipmentRequestLineInput[],
): EquipmentRequestLineInput[] {
  const seen = new Set<number>();
  const result: EquipmentRequestLineInput[] = [];
  for (const line of lines) {
    if (!line.quantity) continue;
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < 0 ||
      line.quantity > MAX_REQUEST_QUANTITY
    ) {
      throw new EquipmentError("Cantidad inválida en la solicitud");
    }
    if (seen.has(line.typeId)) {
      throw new EquipmentError("Un tipo de equipo aparece dos veces");
    }
    seen.add(line.typeId);
    result.push({ typeId: line.typeId, quantity: line.quantity });
  }
  return result;
}

/** Status after organizers save; a submitted request stays submitted. */
export function nextRequestStatus(
  current: EquipmentRequestStatus | null,
  submit: boolean,
): EquipmentRequestStatus {
  if (current && !EDITABLE_REQUEST_STATUSES.includes(current)) {
    throw new EquipmentError(
      "El delegado ya confirmó el equipo; pídele los cambios directamente",
    );
  }
  if (submit || current === "submitted") return "submitted";
  return "draft";
}

/** Delegates confirm sent (or already confirmed) requests of competitions that haven't ended. */
export function assertRequestConfirmable(
  request: { status: EquipmentRequestStatus; competitionEndDate: string },
  today: string,
) {
  if (request.status === "cancelled") {
    throw new EquipmentError("La solicitud fue cancelada");
  }
  if (request.status === "draft") {
    throw new EquipmentError(
      "Los organizadores aún no envían la solicitud de equipo",
    );
  }
  if (request.competitionEndDate < today) {
    throw new EquipmentError("La competencia ya terminó");
  }
}

/** A confirmation blocks its units from the moment it's saved until the competition ends. */
export function isReservationActive(
  request: { status: EquipmentRequestStatus; competitionEndDate: string },
  today: string,
) {
  return request.status === "fulfilled" && request.competitionEndDate >= today;
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

function activeReservation(excludeRequestId?: number) {
  return and(
    eq(equipmentRequests.status, "fulfilled"),
    gte(competitions.endDate, todayInMexico()),
    excludeRequestId
      ? ne(equipmentConfirmationLines.requestId, excludeRequestId)
      : undefined,
  );
}

function competitionLabel(row: { name: string | null; city: string }) {
  return row.name?.trim() || row.city;
}

/** Serialized units held by an active confirmation, with the competition they're reserved for. */
async function reservedItems(
  dbx: EquipmentDb,
  itemIds: number[] | null,
  excludeRequestId?: number,
) {
  if (itemIds && itemIds.length === 0) {
    return new Map<number, { competitionId: number; name: string }>();
  }
  const rows = await dbx
    .select({
      itemId: equipmentConfirmationLines.itemId,
      competitionId: competitions.id,
      name: competitions.name,
      city: competitions.city,
    })
    .from(equipmentConfirmationLines)
    .innerJoin(
      equipmentRequests,
      eq(equipmentRequests.id, equipmentConfirmationLines.requestId),
    )
    .innerJoin(
      competitions,
      eq(competitions.id, equipmentRequests.competitionId),
    )
    .where(
      and(
        itemIds
          ? inArray(equipmentConfirmationLines.itemId, itemIds)
          : sql`${equipmentConfirmationLines.itemId} is not null`,
        activeReservation(excludeRequestId),
      ),
    );
  return new Map(
    rows.map((row) => [
      row.itemId!,
      { competitionId: row.competitionId, name: competitionLabel(row) },
    ]),
  );
}

/** Bulk units of `typeId` that `guardianUserId` has confirmed for competitions. */
async function bulkReserved(
  tx: EquipmentDb,
  typeId: number,
  guardianUserId: string,
  excludeRequestId?: number,
) {
  const [row] = await tx
    .select({
      total: sql<number>`coalesce(sum(${equipmentConfirmationLines.quantity}), 0)::int`,
    })
    .from(equipmentConfirmationLines)
    .innerJoin(
      equipmentRequests,
      eq(equipmentRequests.id, equipmentConfirmationLines.requestId),
    )
    .innerJoin(
      competitions,
      eq(competitions.id, equipmentRequests.competitionId),
    )
    .where(
      and(
        eq(equipmentConfirmationLines.typeId, typeId),
        isNull(equipmentConfirmationLines.itemId),
        eq(equipmentConfirmationLines.guardianUserId, guardianUserId),
        activeReservation(excludeRequestId),
      ),
    );
  return row?.total ?? 0;
}

/** Bulk units of `typeId` the guardian can't lend, move or remove right now. */
async function bulkCommitted(
  tx: EquipmentDb,
  typeId: number,
  guardianUserId: string,
  excludeRequestId?: number,
) {
  const onLoan = await bulkOnLoan(tx, typeId, guardianUserId);
  const reserved = await bulkReserved(
    tx,
    typeId,
    guardianUserId,
    excludeRequestId,
  );
  return onLoan + reserved;
}

async function assertNotReserved(
  tx: EquipmentDb,
  items: readonly { id: number; sku: string }[],
) {
  const reserved = await reservedItems(
    tx,
    items.map((item) => item.id),
  );
  for (const item of items) {
    const reservation = reserved.get(item.id);
    if (reservation) {
      throw new EquipmentError(
        `${item.sku} está reservada para ${reservation.name}`,
      );
    }
  }
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

/** Obsolete types stay in inventory but organizers can't request them and delegates can't confirm them. */
export async function setEquipmentTypeObsolete(
  tx: EquipmentDb,
  input: { actorId: string; typeId: number; obsolete: boolean },
) {
  const type = await getTypeOrThrow(tx, input.typeId);
  if (Boolean(type.obsoleteAt) === input.obsolete) return type;
  const obsoleteAt = input.obsolete ? new Date() : null;
  await tx
    .update(equipmentTypes)
    .set({ obsoleteAt })
    .where(eq(equipmentTypes.id, type.id));
  await tx.insert(equipmentEvents).values({
    action: "item_updated",
    actorId: input.actorId,
    typeId: type.id,
    details: {
      obsolete: { before: Boolean(type.obsoleteAt), after: input.obsolete },
    },
  });
  return { ...type, obsoleteAt };
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
      await assertNotReserved(tx, items);
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
      const committed = await bulkCommitted(tx, type.id, line.guardianUserId);
      assertBulkAvailable(
        line.quantity,
        availableQuantity(quantity, committed),
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

  if (changes.status && input.status === "retired") {
    const onLoan = await openLoanItemIds(tx, [item.id]);
    if (onLoan.has(item.id)) {
      throw new EquipmentError("No se puede dar de baja una unidad prestada");
    }
    await assertNotReserved(tx, [item]);
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
  await assertNotReserved(tx, moving);
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
  const committed = await bulkCommitted(tx, type.id, input.fromUserId);
  assertBulkAvailable(
    input.quantity,
    availableQuantity(quantity, committed),
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
  const reserved = await bulkReserved(tx, type.id, input.guardianUserId);
  if (quantity + input.delta < onLoan + reserved) {
    throw new EquipmentError(
      reserved > 0
        ? `No puedes dejar menos de ${onLoan + reserved} (${onLoan} prestados y ${reserved} reservados para competencias)`
        : `No puedes dejar menos de ${onLoan} (prestados actualmente)`,
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

/** `quantity` free units of a serialized type held by `guardianUserId`, best first. */
async function pickFreeUnits(
  tx: EquipmentDb,
  input: {
    typeId: number;
    quantity: number;
    guardianUserId: string;
    exclude: ReadonlySet<number>;
    excludeRequestId?: number;
  },
): Promise<number[]> {
  if (input.quantity <= 0) return [];
  const type = await getTypeOrThrow(tx, input.typeId);
  if (type.tracking !== "serialized") {
    throw new EquipmentError(`${type.name} se maneja por cantidad`);
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
        eq(equipmentItems.guardianUserId, input.guardianUserId),
        inArray(equipmentItems.status, [...LENDABLE_STATUSES]),
      ),
    );
  const ids = candidates.map((c) => c.id);
  const busy = await openLoanItemIds(tx, ids);
  const reserved = await reservedItems(tx, ids, input.excludeRequestId);
  const free = candidates.filter(
    (c) => !busy.has(c.id) && !reserved.has(c.id) && !input.exclude.has(c.id),
  );
  if (free.length < input.quantity) {
    throw new EquipmentError(
      `Solo hay ${free.length} ${type.name} disponible(s) con ese guardián`,
    );
  }
  return pickUnits(free, input.quantity).map((unit) => unit.id);
}

async function lockCandidateItems(
  tx: EquipmentDb,
  ids: number[],
  excludeRequestId?: number,
) {
  if (ids.length === 0) return [];
  const items = await tx
    .select()
    .from(equipmentItems)
    .where(inArray(equipmentItems.id, ids))
    .for("update");
  if (items.length !== ids.length) {
    throw new EquipmentError("Alguna unidad no existe");
  }
  const busy = await openLoanItemIds(tx, ids);
  const reserved = await reservedItems(tx, ids, excludeRequestId);
  return items.map((item) => ({
    ...item,
    onOpenLoan: busy.has(item.id),
    reservedFor: reserved.get(item.id)?.name ?? null,
  }));
}

type BulkLineInput = {
  typeId: number;
  quantity: number;
  guardianUserId: string;
};

/** Drops empty rows; each type/guardian pair must fit in what that guardian has free. */
async function validateBulkLines(
  tx: EquipmentDb,
  lines: readonly BulkLineInput[],
  excludeRequestId?: number,
) {
  const result: (BulkLineInput & { type: EquipmentType })[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (line.quantity <= 0) continue;
    const type = await getTypeOrThrow(tx, line.typeId);
    if (type.tracking !== "bulk") {
      throw new EquipmentError(`${type.name} se maneja por unidad`);
    }
    const key = `${type.id}:${line.guardianUserId}`;
    if (seen.has(key)) {
      throw new EquipmentError(`${type.name} aparece dos veces`);
    }
    seen.add(key);
    const quantity = await stockQuantity(tx, type.id, line.guardianUserId);
    const committed = await bulkCommitted(
      tx,
      type.id,
      line.guardianUserId,
      excludeRequestId,
    );
    assertBulkAvailable(
      line.quantity,
      availableQuantity(quantity, committed),
      type.name,
    );
    result.push({ ...line, type });
  }
  return result;
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
    const picked = await pickFreeUnits(tx, {
      ...pick,
      guardianUserId: input.lentByUserId,
      exclude: itemIds,
    });
    for (const id of picked) itemIds.add(id);
  }

  const items = await lockCandidateItems(tx, [...itemIds]);
  assertItemsLendable(items, input.lentByUserId);

  const bulk = await validateBulkLines(
    tx,
    (input.bulk ?? []).map((line) => ({
      ...line,
      guardianUserId: input.lentByUserId,
    })),
  );

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
      details: null,
    })),
  ]);

  const summary = await describeLoan(tx, loanId);
  return { loanId, summary };
}

export type SaveEquipmentRequestInput = {
  actorId: string;
  competitionId: number;
  lines: EquipmentRequestLineInput[];
  notes?: string | null;
  /** Sends it to the delegates; otherwise it is saved as is. */
  submit?: boolean;
};

export async function saveEquipmentRequest(
  tx: EquipmentDb,
  input: SaveEquipmentRequestInput,
): Promise<{
  requestId: number;
  status: EquipmentRequestStatus;
  summary: string;
}> {
  const lines = normalizeRequestLines(input.lines);
  const submit = Boolean(input.submit);
  if (submit && lines.length === 0) {
    throw new EquipmentError("Agrega al menos un equipo antes de enviar");
  }

  const [competition] = await tx
    .select({ id: competitions.id, endDate: competitions.endDate })
    .from(competitions)
    .where(eq(competitions.id, input.competitionId));
  if (!competition) throw new EquipmentError("Competencia no encontrada");
  if (competition.endDate < todayInMexico()) {
    throw new EquipmentError(
      "La competencia ya terminó; ya no se puede solicitar equipo",
    );
  }

  const types = lines.length
    ? await tx
        .select()
        .from(equipmentTypes)
        .where(
          inArray(
            equipmentTypes.id,
            lines.map((line) => line.typeId),
          ),
        )
    : [];
  const typeById = new Map(types.map((type) => [type.id, type]));
  for (const line of lines) {
    const type = typeById.get(line.typeId);
    if (!type || type.archivedAt) {
      throw new EquipmentError("Algún tipo de equipo ya no está disponible");
    }
    if (type.obsoleteAt) {
      throw new EquipmentError(
        `${type.name} es obsoleto; quítalo de la solicitud`,
      );
    }
    if (!ORGANIZER_REQUEST_CATEGORIES.includes(type.category)) {
      throw new EquipmentError(
        "Los organizadores solo solicitan timers y displays; el delegado agrega lo demás",
      );
    }
  }

  const [existing] = await tx
    .select()
    .from(equipmentRequests)
    .where(eq(equipmentRequests.competitionId, input.competitionId))
    .for("update");
  const status = nextRequestStatus(existing?.status ?? null, submit);
  const notes = input.notes?.trim() || null;
  const now = new Date();

  let requestId: number;
  if (existing) {
    requestId = existing.id;
    await tx
      .update(equipmentRequests)
      .set({
        status,
        notes,
        submittedAt: submit ? now : existing.submittedAt,
        updatedAt: now,
      })
      .where(eq(equipmentRequests.id, existing.id));
    await tx
      .delete(equipmentRequestLines)
      .where(eq(equipmentRequestLines.requestId, existing.id));
  } else {
    const [created] = await tx
      .insert(equipmentRequests)
      .values({
        competitionId: input.competitionId,
        status,
        notes,
        requestedByUserId: input.actorId,
        submittedAt: submit ? now : null,
      })
      .returning({ id: equipmentRequests.id });
    requestId = created!.id;
  }

  if (lines.length) {
    await tx
      .insert(equipmentRequestLines)
      .values(lines.map((line) => ({ requestId, ...line })));
  }

  const summary = lines
    .map((line) => `${line.quantity} ${typeById.get(line.typeId)!.name}`)
    .join(", ");

  await tx.insert(equipmentEvents).values({
    action: submit ? "request_submitted" : "request_updated",
    actorId: input.actorId,
    details: {
      requestId,
      competitionId: input.competitionId,
      status: { before: existing?.status ?? null, after: status },
      lines,
      summary,
    },
  });

  return { requestId, status, summary };
}

export type ConfirmEquipmentInput = {
  actorId: string;
  requestId: number;
  itemIds?: number[];
  /** Serialized types: N units chosen automatically from that guardian. */
  autoPick?: { typeId: number; quantity: number; guardianUserId: string }[];
  bulk?: { typeId: number; quantity: number; guardianUserId: string }[];
};

/**
 * The delegates confirm what they'll bring to the competition. Nothing is
 * lent: units stay with their guardian but are reserved until the competition
 * ends. Confirming again replaces the previous lines.
 */
export async function confirmEquipmentRequest(
  tx: EquipmentDb,
  input: ConfirmEquipmentInput,
): Promise<{ requestId: number; competitionId: number; summary: string }> {
  const [request] = await tx
    .select({
      id: equipmentRequests.id,
      status: equipmentRequests.status,
      competitionId: equipmentRequests.competitionId,
      competitionEndDate: competitions.endDate,
    })
    .from(equipmentRequests)
    .innerJoin(
      competitions,
      eq(competitions.id, equipmentRequests.competitionId),
    )
    .where(eq(equipmentRequests.id, input.requestId))
    .for("update", { of: equipmentRequests });
  if (!request) throw new EquipmentError("Solicitud no encontrada");
  assertRequestConfirmable(request, todayInMexico());

  const itemIds = new Set(input.itemIds ?? []);
  for (const pick of input.autoPick ?? []) {
    await assertUserExists(tx, pick.guardianUserId);
    const picked = await pickFreeUnits(tx, {
      ...pick,
      exclude: itemIds,
      excludeRequestId: request.id,
    });
    for (const id of picked) itemIds.add(id);
  }

  const items = await lockCandidateItems(tx, [...itemIds], request.id);
  assertItemsConfirmable(items);

  for (const line of input.bulk ?? []) {
    if (line.quantity > 0) await assertUserExists(tx, line.guardianUserId);
  }
  const bulk = await validateBulkLines(tx, input.bulk ?? [], request.id);

  if (items.length === 0 && bulk.length === 0) {
    throw new EquipmentError("Agrega al menos un equipo a la confirmación");
  }
  const typeIds = [
    ...new Set([
      ...items.map((item) => item.typeId),
      ...bulk.map((l) => l.typeId),
    ]),
  ];
  const [obsolete] = await tx
    .select({ name: equipmentTypes.name })
    .from(equipmentTypes)
    .where(
      and(
        inArray(equipmentTypes.id, typeIds),
        sql`${equipmentTypes.obsoleteAt} is not null`,
      ),
    )
    .limit(1);
  if (obsolete) {
    throw new EquipmentError(
      `${obsolete.name} es obsoleto; no se puede confirmar para competencias`,
    );
  }

  await tx
    .delete(equipmentConfirmationLines)
    .where(eq(equipmentConfirmationLines.requestId, request.id));
  await tx.insert(equipmentConfirmationLines).values([
    ...items.map((item) => ({
      requestId: request.id,
      typeId: item.typeId,
      itemId: item.id,
      guardianUserId: item.guardianUserId!,
      quantity: 1,
    })),
    ...bulk.map((line) => ({
      requestId: request.id,
      typeId: line.typeId,
      guardianUserId: line.guardianUserId,
      quantity: line.quantity,
    })),
  ]);
  await tx
    .update(equipmentRequests)
    .set({
      status: "fulfilled",
      fulfilledAt: sql`coalesce(${equipmentRequests.fulfilledAt}, now())`,
      confirmedByUserId: input.actorId,
      updatedAt: new Date(),
    })
    .where(eq(equipmentRequests.id, request.id));

  const details = {
    requestId: request.id,
    competitionId: request.competitionId,
  };
  await tx.insert(equipmentEvents).values([
    ...items.map((item) => ({
      action: "request_confirmed" as const,
      actorId: input.actorId,
      itemId: item.id,
      typeId: item.typeId,
      guardianUserId: item.guardianUserId,
      details: { ...details, sku: item.sku },
    })),
    ...bulk.map((line) => ({
      action: "request_confirmed" as const,
      actorId: input.actorId,
      typeId: line.typeId,
      guardianUserId: line.guardianUserId,
      quantityDelta: line.quantity,
      details,
    })),
  ]);

  const summary = await describeConfirmation(tx, request.id);
  return {
    requestId: request.id,
    competitionId: request.competitionId,
    summary,
  };
}

/** Cancelling a confirmed request drops its lines, which frees the reserved units. */
export async function cancelEquipmentRequest(
  tx: EquipmentDb,
  input: { actorId: string; requestId: number },
) {
  const [request] = await tx
    .select()
    .from(equipmentRequests)
    .where(eq(equipmentRequests.id, input.requestId))
    .for("update");
  if (!request) throw new EquipmentError("Solicitud no encontrada");
  if (request.status === "cancelled") return request;

  const confirmed =
    request.status === "fulfilled"
      ? await describeConfirmation(tx, request.id)
      : null;
  await tx
    .delete(equipmentConfirmationLines)
    .where(eq(equipmentConfirmationLines.requestId, request.id));
  await tx
    .update(equipmentRequests)
    .set({
      status: "cancelled",
      fulfilledAt: null,
      confirmedByUserId: null,
      updatedAt: new Date(),
    })
    .where(eq(equipmentRequests.id, request.id));
  await tx.insert(equipmentEvents).values({
    action: "request_cancelled",
    actorId: input.actorId,
    details: {
      requestId: request.id,
      competitionId: request.competitionId,
      status: { before: request.status, after: "cancelled" },
      ...(confirmed ? { confirmed } : {}),
    },
  });
  return request;
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

export async function describeConfirmation(tx: EquipmentDb, requestId: number) {
  const rows = await tx
    .select({
      name: equipmentTypes.name,
      quantity: sql<number>`sum(${equipmentConfirmationLines.quantity})::int`,
    })
    .from(equipmentConfirmationLines)
    .innerJoin(
      equipmentTypes,
      eq(equipmentTypes.id, equipmentConfirmationLines.typeId),
    )
    .where(eq(equipmentConfirmationLines.requestId, requestId))
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
  reservedFor: { competitionId: number; name: string } | null;
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
  const reserved = rows.length ? await reservedItems(dbx, null) : new Map();

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
    reservedFor: reserved.get(row.id) ?? null,
  }));
}

export type EquipmentStockRow = {
  typeId: number;
  typeName: string;
  category: EquipmentCategory;
  quantity: number;
  onLoan: number;
  /** Confirmed for competitions that haven't ended; still with the guardian. */
  reserved: number;
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
      reserved: sql<number>`coalesce((
        select sum(${equipmentConfirmationLines.quantity})
        from ${equipmentConfirmationLines}
        inner join ${equipmentRequests} on ${equipmentRequests.id} = ${equipmentConfirmationLines.requestId}
        inner join ${competitions} on ${competitions.id} = ${equipmentRequests.competitionId}
        where ${equipmentConfirmationLines.typeId} = ${equipmentStock.typeId}
          and ${equipmentConfirmationLines.itemId} is null
          and ${equipmentConfirmationLines.guardianUserId} = ${equipmentStock.guardianUserId}
          and ${equipmentRequests.status} = 'fulfilled'
          and ${competitions.endDate} >= ${todayInMexico()}
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
    .filter(
      (row) =>
        row.quantity > 0 || row.onLoan > 0 || row.reserved > 0 || row.notes,
    )
    .map((row) => ({
      typeId: row.typeId,
      typeName: row.typeName,
      category: row.category,
      quantity: row.quantity,
      onLoan: row.onLoan,
      reserved: row.reserved,
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
  reserved: number;
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
      reserved: 0,
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
        else if (item.reservedFor) row.reserved++;
        else if (item.status !== "in_repair") row.available++;
      }
    } else {
      for (const entry of stock) {
        if (entry.typeId !== type.id) continue;
        row.total += entry.quantity;
        row.onLoan += entry.onLoan;
        row.reserved += entry.reserved;
        row.available += availableQuantity(
          entry.quantity,
          entry.onLoan + entry.reserved,
        );
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
  filter: {
    borrowerUserId?: string;
    loanId?: number;
    competitionId?: number;
    openOnly?: boolean;
  } = {},
): Promise<EquipmentLoanRow[]> {
  const borrower = alias(user, "borrower");
  const lender = alias(user, "lender");

  const conditions = [];
  if (filter.borrowerUserId) {
    conditions.push(eq(equipmentLoans.borrowerUserId, filter.borrowerUserId));
  }
  if (filter.competitionId) {
    conditions.push(eq(equipmentLoans.competitionId, filter.competitionId));
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

export type RequestableEquipmentType = {
  id: number;
  name: string;
  category: EquipmentCategory;
  tracking: EquipmentTracking;
  /** Always 0 for obsolete types, which can't be requested. */
  available: number;
  obsolete: boolean;
};

/**
 * Active types with how many can currently be lent, for the request form.
 * With `guardianUserIds`, only equipment held by those guardians counts.
 */
export async function listRequestableEquipmentTypes(
  dbx: EquipmentDb,
  filter: { guardianUserIds?: readonly string[] } = {},
): Promise<RequestableEquipmentType[]> {
  const [types, allItems, allStock] = await Promise.all([
    listEquipmentTypes(dbx),
    listEquipmentItems(dbx),
    listEquipmentStock(dbx),
  ]);
  const guardians = filter.guardianUserIds
    ? new Set(filter.guardianUserIds)
    : null;
  const items = guardians
    ? allItems.filter(
        (item) => item.guardian && guardians.has(item.guardian.id),
      )
    : allItems;
  const stock = guardians
    ? allStock.filter((entry) => guardians.has(entry.guardian.id))
    : allStock;
  return summarizeInventory(types, items, stock).map((row) => ({
    id: row.type.id,
    name: row.type.name,
    category: row.type.category,
    tracking: row.type.tracking,
    available: row.type.obsoleteAt ? 0 : row.available,
    obsolete: Boolean(row.type.obsoleteAt),
  }));
}

export type EquipmentRequestLineRow = {
  typeId: number;
  typeName: string;
  category: EquipmentCategory;
  tracking: EquipmentTracking;
  quantity: number;
};

export type EquipmentRequestRow = {
  id: number;
  competitionId: number;
  status: EquipmentRequestStatus;
  notes: string | null;
  submittedAt: Date | null;
  fulfilledAt: Date | null;
  updatedAt: Date;
  requestedBy: { id: string; name: string } | null;
  confirmedBy: { id: string; name: string } | null;
  lines: EquipmentRequestLineRow[];
  summary: string;
};

async function loadRequests(
  dbx: EquipmentDb,
  where: SQL | undefined,
): Promise<EquipmentRequestRow[]> {
  const confirmer = alias(user, "confirmer");
  const requests = await dbx
    .select({
      id: equipmentRequests.id,
      competitionId: equipmentRequests.competitionId,
      status: equipmentRequests.status,
      notes: equipmentRequests.notes,
      submittedAt: equipmentRequests.submittedAt,
      fulfilledAt: equipmentRequests.fulfilledAt,
      updatedAt: equipmentRequests.updatedAt,
      requestedById: user.id,
      requestedByName: user.name,
      confirmedById: confirmer.id,
      confirmedByName: confirmer.name,
    })
    .from(equipmentRequests)
    .leftJoin(user, eq(user.id, equipmentRequests.requestedByUserId))
    .leftJoin(confirmer, eq(confirmer.id, equipmentRequests.confirmedByUserId))
    .where(where)
    .orderBy(desc(equipmentRequests.updatedAt));
  if (requests.length === 0) return [];

  const lines = await dbx
    .select({
      requestId: equipmentRequestLines.requestId,
      typeId: equipmentRequestLines.typeId,
      typeName: equipmentTypes.name,
      category: equipmentTypes.category,
      tracking: equipmentTypes.tracking,
      quantity: equipmentRequestLines.quantity,
    })
    .from(equipmentRequestLines)
    .innerJoin(
      equipmentTypes,
      eq(equipmentTypes.id, equipmentRequestLines.typeId),
    )
    .where(
      inArray(
        equipmentRequestLines.requestId,
        requests.map((request) => request.id),
      ),
    )
    .orderBy(asc(equipmentTypes.sortOrder), asc(equipmentTypes.name));

  return requests.map(
    ({
      requestedById,
      requestedByName,
      confirmedById,
      confirmedByName,
      ...request
    }) => {
      const own = lines
        .filter((line) => line.requestId === request.id)
        .map((line) => ({
          typeId: line.typeId,
          typeName: line.typeName,
          category: line.category,
          tracking: line.tracking,
          quantity: line.quantity,
        }));
      return {
        ...request,
        requestedBy: requestedById
          ? { id: requestedById, name: requestedByName! }
          : null,
        confirmedBy: confirmedById
          ? { id: confirmedById, name: confirmedByName! }
          : null,
        lines: own,
        summary: own
          .map((line) => `${line.quantity} ${line.typeName}`)
          .join(", "),
      };
    },
  );
}

export async function getEquipmentRequest(
  dbx: EquipmentDb,
  filter: { requestId: number } | { competitionId: number },
) {
  const [request] = await loadRequests(
    dbx,
    "requestId" in filter
      ? eq(equipmentRequests.id, filter.requestId)
      : eq(equipmentRequests.competitionId, filter.competitionId),
  );
  return request ?? null;
}

export type EquipmentRequestListRow = EquipmentRequestRow & {
  competition: {
    id: number;
    name: string | null;
    city: string;
    startDate: string;
    endDate: string;
  };
};

export async function listEquipmentRequests(
  dbx: EquipmentDb,
  filter: { status?: EquipmentRequestStatus } = {},
): Promise<EquipmentRequestListRow[]> {
  const requests = await loadRequests(
    dbx,
    filter.status ? eq(equipmentRequests.status, filter.status) : undefined,
  );
  if (requests.length === 0) return [];
  const rows = await dbx
    .select({
      id: competitions.id,
      name: competitions.name,
      city: competitions.city,
      startDate: competitions.startDate,
      endDate: competitions.endDate,
    })
    .from(competitions)
    .where(
      inArray(
        competitions.id,
        requests.map((request) => request.competitionId),
      ),
    );
  const byId = new Map(rows.map((row) => [row.id, row]));
  return requests
    .filter((request) => byId.has(request.competitionId))
    .map((request) => ({
      ...request,
      competition: byId.get(request.competitionId)!,
    }))
    .sort((a, b) =>
      a.competition.startDate.localeCompare(b.competition.startDate),
    );
}

export type EquipmentConfirmationLineRow = {
  id: number;
  typeId: number;
  typeName: string;
  category: EquipmentCategory;
  tracking: EquipmentTracking;
  itemId: number | null;
  sku: string | null;
  quantity: number;
  guardian: EquipmentPerson;
};

export type EquipmentConfirmation = {
  confirmedAt: Date | null;
  confirmedBy: { id: string; name: string } | null;
  lines: EquipmentConfirmationLineRow[];
  summary: string;
};

export async function listConfirmationLines(
  dbx: EquipmentDb,
  requestId: number,
): Promise<EquipmentConfirmationLineRow[]> {
  const rows = await dbx
    .select({
      id: equipmentConfirmationLines.id,
      typeId: equipmentConfirmationLines.typeId,
      typeName: equipmentTypes.name,
      category: equipmentTypes.category,
      tracking: equipmentTypes.tracking,
      itemId: equipmentConfirmationLines.itemId,
      sku: equipmentItems.sku,
      quantity: equipmentConfirmationLines.quantity,
      guardianId: user.id,
      guardianName: user.name,
      guardianWcaId: user.wcaId,
      guardianImage: user.image,
    })
    .from(equipmentConfirmationLines)
    .innerJoin(
      equipmentTypes,
      eq(equipmentTypes.id, equipmentConfirmationLines.typeId),
    )
    .innerJoin(user, eq(user.id, equipmentConfirmationLines.guardianUserId))
    .leftJoin(
      equipmentItems,
      eq(equipmentItems.id, equipmentConfirmationLines.itemId),
    )
    .where(eq(equipmentConfirmationLines.requestId, requestId))
    .orderBy(
      asc(user.name),
      asc(equipmentTypes.sortOrder),
      asc(equipmentTypes.name),
      asc(equipmentItems.sku),
    );
  return rows.map(
    ({ guardianId, guardianName, guardianWcaId, guardianImage, ...line }) => ({
      ...line,
      guardian: {
        id: guardianId,
        name: guardianName,
        wcaId: guardianWcaId,
        image: guardianImage,
      },
    }),
  );
}

export type EquipmentSheetPerson = EquipmentPerson & { email: string | null };

export type CompetitionEquipmentSheet = {
  competition: {
    id: number;
    name: string | null;
    city: string;
    stateName: string;
    startDate: string;
    endDate: string;
  };
  primaryDelegate: EquipmentSheetPerson | null;
  primaryOrganizer: EquipmentSheetPerson | null;
  request: EquipmentRequestRow | null;
  /** What the delegates confirmed they'll bring; `null` until they do. */
  confirmation: EquipmentConfirmation | null;
};

/** Everything the equipment card, the panel and the printable sheet show. */
export async function getCompetitionEquipmentSheet(
  dbx: EquipmentDb,
  competitionId: number,
): Promise<CompetitionEquipmentSheet | null> {
  const [competition] = await dbx
    .select({
      id: competitions.id,
      name: competitions.name,
      city: competitions.city,
      stateName: states.name,
      startDate: competitions.startDate,
      endDate: competitions.endDate,
    })
    .from(competitions)
    .innerJoin(states, eq(states.id, competitions.stateId))
    .where(eq(competitions.id, competitionId));
  if (!competition) return null;

  const [delegates, organizers, request] = await Promise.all([
    dbx
      .select({ ...personColumns, email: user.email })
      .from(competitionDelegates)
      .innerJoin(user, eq(user.wcaId, competitionDelegates.delegateWcaId))
      .where(
        and(
          eq(competitionDelegates.competitionId, competitionId),
          eq(competitionDelegates.status, "accepted"),
        ),
      )
      .orderBy(desc(competitionDelegates.isPrimary), asc(user.name)),
    dbx
      .select({ ...personColumns, email: user.email })
      .from(competitionOrganizers)
      .innerJoin(user, eq(user.id, competitionOrganizers.organizerUserId))
      .where(eq(competitionOrganizers.competitionId, competitionId))
      .orderBy(desc(competitionOrganizers.isPrimary), asc(user.name)),
    getEquipmentRequest(dbx, { competitionId }),
  ]);

  let confirmation: EquipmentConfirmation | null = null;
  if (request?.status === "fulfilled") {
    const lines = await listConfirmationLines(dbx, request.id);
    const totals = new Map<string, number>();
    for (const line of lines) {
      totals.set(
        line.typeName,
        (totals.get(line.typeName) ?? 0) + line.quantity,
      );
    }
    confirmation = {
      confirmedAt: request.fulfilledAt,
      confirmedBy: request.confirmedBy,
      lines,
      summary: [...totals].map(([name, qty]) => `${qty} ${name}`).join(", "),
    };
  }

  return {
    competition,
    primaryDelegate: delegates[0] ?? null,
    primaryOrganizer: organizers[0] ?? null,
    request,
    confirmation,
  };
}
