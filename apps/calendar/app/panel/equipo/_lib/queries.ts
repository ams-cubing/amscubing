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
  type EquipmentEventAction,
} from "@workspace/db/equipment";

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
        (item.status === "functional" || item.status === "faulty"),
    ),
    stock,
    guardians,
  };
}

/** Organizers' request plus linked loans, for the competition page and the sheet. */
export async function getCompetitionEquipment(competitionId: number) {
  tag();
  return getCompetitionEquipmentSheet(db, competitionId);
}

/** Request and team of its competition, to prefill a new loan. */
export async function getRequestForLoan(requestId: number) {
  tag();
  const request = await getEquipmentRequest(db, { requestId });
  if (!request) return null;
  const sheet = await getCompetitionEquipmentSheet(db, request.competitionId);
  return sheet ? { request, sheet } : null;
}

export async function getOpenEquipmentRequests() {
  tag();
  return listEquipmentRequests(db, { status: "submitted" });
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
