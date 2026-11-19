"use cache";

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { db } from "@workspace/db";
import { getCompetitionEquipmentSheet } from "@workspace/db/equipment";

/** Organizers' request plus confirmed lines, for the competition page and sheet. */
export async function getCompetitionEquipment(competitionId: number) {
  cacheLife({ revalidate: 1, stale: 1, expire: 60 });
  cacheTag("equipment");
  return getCompetitionEquipmentSheet(db, competitionId);
}
