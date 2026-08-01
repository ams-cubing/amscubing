import "server-only";

import { db } from "@workspace/db";
import {
  competitions,
  states,
  regions,
  competitionDelegates,
  competitionOrganizers,
  user,
} from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function getUserOrganizerCompetitionIds(wcaId: string) {
  const rows = await db
    .select({ competitionId: competitionOrganizers.competitionId })
    .from(competitionOrganizers)
    .where(eq(competitionOrganizers.organizerWcaId, wcaId));
  return rows.map((c) => c.competitionId);
}

export async function getUserCompetitions(competitionIds: number[]) {
  return db
    .select({
      id: competitions.id,
      name: competitions.name,
      city: competitions.city,
      startDate: competitions.startDate,
      endDate: competitions.endDate,
      trelloUrl: competitions.trelloUrl,
      boardId: competitions.boardId,
      statusPublic: competitions.statusPublic,
      statusInternal: competitions.statusInternal,
      stateName: states.name,
      regionName: regions.displayName,
    })
    .from(competitions)
    .leftJoin(states, eq(competitions.stateId, states.id))
    .leftJoin(regions, eq(states.regionId, regions.id))
    .where(inArray(competitions.id, competitionIds));
}

export async function getDelegatesForCompetitions(competitionIds: number[]) {
  return db
    .select({
      competitionId: competitionDelegates.competitionId,
      delegateName: user.name,
      delegateWcaId: user.wcaId,
      isPrimary: competitionDelegates.isPrimary,
    })
    .from(competitionDelegates)
    .leftJoin(user, eq(competitionDelegates.delegateWcaId, user.wcaId))
    .where(inArray(competitionDelegates.competitionId, competitionIds));
}

export async function getOrganizersForCompetitions(competitionIds: number[]) {
  return db
    .select({
      competitionId: competitionOrganizers.competitionId,
      organizerName: user.name,
      organizerWcaId: user.wcaId,
      isPrimary: competitionOrganizers.isPrimary,
    })
    .from(competitionOrganizers)
    .leftJoin(user, eq(competitionOrganizers.organizerWcaId, user.wcaId))
    .where(inArray(competitionOrganizers.competitionId, competitionIds));
}
