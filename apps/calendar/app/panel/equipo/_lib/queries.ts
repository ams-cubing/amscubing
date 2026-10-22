"use cache";

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { asc, gte } from "drizzle-orm";
import { db } from "@workspace/db";
import { competitions } from "@workspace/db/schema";
import {
  getCompetitionEquipmentSheet,
  getEquipmentItemBySku,
  getEquipmentLoan,
  getEquipmentRequest,
  listEquipmentRequests,
  groupByGuardian,
  listEquipmentAcquisitions,
  listEquipmentEvents,
  listEquipmentGuardians,
  listEquipmentItems,
  listEquipmentLoans,
  listEquipmentStock,
  listEquipmentTypes,
  summarizeInventory,
  todayInMexico,
  isReservationActive,
  LENDABLE_STATUSES,
  type EquipmentEventAction,
} from "@workspace/db/equipment";
import { competitionDelegatesOnly } from "@workspace/db/notifications";

function tag() {
  cacheLife({ revalidate: 1, stale: 1, expire: 60 });
  cacheTag("equipment");
}

export async function getInventoryOverview() {
  tag();
  const [types, items, stock] = await Promise.all([
    listEquipmentTypes(db),
    listEquipmentItems(db),
    listEquipmentStock(db),
  ]);
  return {
    types,
    items,
    stock,
    summary: summarizeInventory(types, items, stock),
    guardians: groupByGuardian(items, stock),
  };
}

export async function getEquipmentTypes() {
  tag();
  return listEquipmentTypes(db);
}

export async function getGuardians() {
  tag();
  return listEquipmentGuardians(db);
}

export async function getItemDetail(sku: string) {
  tag();
  return getEquipmentItemBySku(db, sku);
}

export async function getLoans() {
  tag();
  return listEquipmentLoans(db);
}

export async function getLoanDetail(loanId: number) {
  tag();
  const loan = await getEquipmentLoan(db, loanId);
  if (!loan) return null;
  const events = await listEquipmentEvents(db, { loanId });
  return { loan, events };
}

export async function getAcquisitions() {
  tag();
  return listEquipmentAcquisitions(db);
}

export async function getActivity(filter: {
  actorId?: string;
  guardianUserId?: string;
  action?: EquipmentEventAction;
}) {
  tag();
  return listEquipmentEvents(db, { ...filter, limit: 500 });
}

/** Inventory available to lend, for the new-loan form. */
export async function getLendableInventory() {
  tag();
  const [types, items, stock, guardians] = await Promise.all([
    listEquipmentTypes(db),
    listEquipmentItems(db),
    listEquipmentStock(db),
    listEquipmentGuardians(db),
  ]);
  return {
    types,
    items: items.filter(
      (item) =>
        item.onLoanId == null &&
        item.reservedFor == null &&
        LENDABLE_STATUSES.includes(item.status),
    ),
    stock,
    guardians,
  };
}

/** Organizers' request plus what the delegates confirmed, for the competition page and the sheet. */
export async function getCompetitionEquipment(competitionId: number) {
  tag();
  return getCompetitionEquipmentSheet(db, competitionId);
}

/**
 * Request, its competition and the inventory a delegate can confirm. Units and
 * quantities already confirmed for this same request count as available.
 */
export async function getRequestForConfirmation(requestId: number) {
  tag();
  const request = await getEquipmentRequest(db, { requestId });
  if (!request) return null;
  const [sheet, types, items, stock, guardians, delegates] = await Promise.all([
    getCompetitionEquipmentSheet(db, request.competitionId),
    listEquipmentTypes(db),
    listEquipmentItems(db),
    listEquipmentStock(db),
    listEquipmentGuardians(db),
    competitionDelegatesOnly(db, request.competitionId),
  ]);
  if (!sheet) return null;

  const ownBulk = new Map<string, number>();
  for (const line of sheet.confirmation?.lines ?? []) {
    if (line.itemId != null) continue;
    const key = `${line.typeId}:${line.guardian.id}`;
    ownBulk.set(key, (ownBulk.get(key) ?? 0) + line.quantity);
  }

  return {
    request,
    sheet,
    types,
    items: items.filter(
      (item) =>
        item.guardian != null &&
        item.onLoanId == null &&
        LENDABLE_STATUSES.includes(item.status) &&
        (item.reservedFor == null ||
          item.reservedFor.competitionId === request.competitionId),
    ),
    stock: stock.map((entry) => ({
      ...entry,
      reserved:
        entry.reserved -
        (ownBulk.get(`${entry.typeId}:${entry.guardian.id}`) ?? 0),
    })),
    guardians,
    delegateIds: delegates.map((delegate) => delegate.id),
  };
}

export async function getOpenEquipmentRequests() {
  tag();
  return listEquipmentRequests(db, { status: "submitted" });
}

export async function getConfirmedEquipmentRequests() {
  tag();
  const today = todayInMexico();
  const requests = await listEquipmentRequests(db, { status: "fulfilled" });
  return requests.filter((request) =>
    isReservationActive(
      {
        status: request.status,
        competitionEndDate: request.competition.endDate,
      },
      today,
    ),
  );
}

/** Upcoming and recent competitions a loan can be attached to. */
export async function getLoanCompetitionOptions(today: string) {
  cacheLife({ revalidate: 60, stale: 60, expire: 300 });
  cacheTag("competitions");
  const since = new Date(`${today}T00:00:00`);
  since.setDate(since.getDate() - 60);
  return db
    .select({
      id: competitions.id,
      name: competitions.name,
      city: competitions.city,
      startDate: competitions.startDate,
    })
    .from(competitions)
    .where(gte(competitions.startDate, since.toISOString().slice(0, 10)))
    .orderBy(asc(competitions.startDate))
    .limit(200);
}
