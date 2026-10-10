import "server-only";

import { db } from "@workspace/db";
import {
  competitions,
  states,
  regions,
  competitionDelegates,
  competitionOrganizers,
  dateRequests,
  user,
} from "@workspace/db/schema";
import { and, asc, desc, eq, gte, inArray, ne } from "drizzle-orm";

function getTodayInMexicoCity() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
  }).format(new Date());
}

export async function getUserOrganizerCompetitionIds(userId: string) {
  const rows = await db
    .select({ competitionId: competitionOrganizers.competitionId })
    .from(competitionOrganizers)
    .where(eq(competitionOrganizers.organizerUserId, userId));
  return rows.map((c) => c.competitionId);
}

export async function getUserDelegateAssignments(wcaId: string) {
  return db
    .select({
      competitionId: competitionDelegates.competitionId,
      status: competitionDelegates.status,
    })
    .from(competitionDelegates)
    .where(
      and(
        eq(competitionDelegates.delegateWcaId, wcaId),
        ne(competitionDelegates.status, "declined"),
      ),
    );
}

export async function getUserDateRequests(userId: string) {
  return db
    .select({
      id: dateRequests.id,
      city: dateRequests.city,
      startDate: dateRequests.startDate,
      endDate: dateRequests.endDate,
      status: dateRequests.status,
      competitionId: dateRequests.competitionId,
      proposedDelegateName: user.name,
      proposedDelegateWcaId: dateRequests.proposedDelegateWcaId,
      stateName: states.name,
      regionName: regions.displayName,
      createdAt: dateRequests.createdAt,
    })
    .from(dateRequests)
    .leftJoin(states, eq(dateRequests.stateId, states.id))
    .leftJoin(regions, eq(states.regionId, regions.id))
    .leftJoin(user, eq(dateRequests.proposedDelegateWcaId, user.wcaId))
    .where(eq(dateRequests.requestedByUserId, userId))
    .orderBy(desc(dateRequests.createdAt));
}

export async function getUserCompetitions(
  competitionIds: number[],
  {
    includePast,
    includeCancelled,
  }: { includePast: boolean; includeCancelled: boolean },
) {
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
    .where(
      and(
        inArray(competitions.id, competitionIds),
        includePast
          ? undefined
          : gte(competitions.endDate, getTodayInMexicoCity()),
        includeCancelled
          ? undefined
          : ne(competitions.statusInternal, "cancelled"),
      ),
    )
    .orderBy(
      includePast ? desc(competitions.startDate) : asc(competitions.startDate),
    );
}

export async function getDelegatesForCompetitions(competitionIds: number[]) {
  return db
    .select({
      competitionId: competitionDelegates.competitionId,
      delegateName: user.name,
      delegateWcaId: user.wcaId,
      isPrimary: competitionDelegates.isPrimary,
      status: competitionDelegates.status,
    })
    .from(competitionDelegates)
    .leftJoin(user, eq(competitionDelegates.delegateWcaId, user.wcaId))
    .where(
      and(
        inArray(competitionDelegates.competitionId, competitionIds),
        ne(competitionDelegates.status, "declined"),
      ),
    );
}

export async function getOrganizersForCompetitions(competitionIds: number[]) {
  return db
    .select({
      competitionId: competitionOrganizers.competitionId,
      organizerUserId: competitionOrganizers.organizerUserId,
      organizerName: user.name,
      organizerWcaId: user.wcaId,
      isPrimary: competitionOrganizers.isPrimary,
    })
    .from(competitionOrganizers)
    .leftJoin(user, eq(competitionOrganizers.organizerUserId, user.id))
    .where(inArray(competitionOrganizers.competitionId, competitionIds));
}
