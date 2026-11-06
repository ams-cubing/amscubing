import "server-only";

import { db } from "@workspace/db";
import {
  availability,
  competitionOrganizers,
  competitions,
  multiCompetitionOrganizers,
  regions,
  states,
  user,
} from "@workspace/db/schema";
import { todayInMexico } from "@workspace/db/equipment";
import { and, eq, gte, inArray } from "drizzle-orm";

import {
  blocksNewDateRequest,
  PENDING_ANNOUNCEMENT_STATUSES,
} from "./pending-competition";

export async function getRecentRequestsCount(userId: string) {
  return db.query.dateRequests.findMany({
    where: (request, { and: andFn, gte, eq: eqFn }) =>
      andFn(
        eqFn(request.requestedByUserId, userId),
        gte(request.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      ),
  });
}

/**
 * Active, unannounced competition the user organizes, which blocks a new date
 * request. Cancelled, finished or past competitions don't count, and nothing
 * blocks organizers a delegate allowed to run several at once.
 */
export async function getPendingAnnouncementCompetition(userId: string) {
  const override = await db.query.multiCompetitionOrganizers.findFirst({
    where: eq(multiCompetitionOrganizers.userId, userId),
    columns: { userId: true },
  });
  if (override) return null;

  const today = todayInMexico();
  const rows = await db
    .select({
      id: competitions.id,
      name: competitions.name,
      city: competitions.city,
      statusPublic: competitions.statusPublic,
      statusInternal: competitions.statusInternal,
      endDate: competitions.endDate,
    })
    .from(competitionOrganizers)
    .innerJoin(
      competitions,
      eq(competitionOrganizers.competitionId, competitions.id),
    )
    .where(
      and(
        eq(competitionOrganizers.organizerUserId, userId),
        inArray(competitions.statusPublic, [...PENDING_ANNOUNCEMENT_STATUSES]),
        gte(competitions.endDate, today),
      ),
    )
    .orderBy(competitions.startDate);

  return rows.find((row) => blocksNewDateRequest(row, today)) ?? null;
}

export async function getDelegatesForState(stateFilter: string) {
  return db
    .select({
      name: user.name,
      email: user.email,
    })
    .from(user)
    .innerJoin(regions, eq(user.regionId, regions.id))
    .innerJoin(states, eq(regions.id, states.regionId))
    .where(and(eq(states.id, stateFilter), eq(user.role, "delegate")));
}

export async function getAvailabilityForState(
  stateFilter: string,
  hasDelegates: boolean,
) {
  if (hasDelegates) {
    return db
      .select({ date: availability.date })
      .from(availability)
      .innerJoin(user, eq(availability.userWcaId, user.wcaId))
      .innerJoin(regions, eq(user.regionId, regions.id))
      .innerJoin(states, eq(regions.id, states.regionId))
      .where(and(eq(states.id, stateFilter), eq(user.role, "delegate")))
      .orderBy(availability.date)
      .groupBy(availability.date);
  }
  return db
    .select({ date: availability.date })
    .from(availability)
    .innerJoin(user, eq(availability.userWcaId, user.wcaId))
    .where(eq(user.role, "delegate"))
    .orderBy(availability.date)
    .groupBy(availability.date);
}

export async function getRegionForState(stateFilter: string) {
  const rows = await db
    .select({ regionName: regions.displayName })
    .from(regions)
    .innerJoin(states, eq(regions.id, states.regionId))
    .where(eq(states.id, stateFilter))
    .limit(1);
  return rows[0]?.regionName ?? null;
}
