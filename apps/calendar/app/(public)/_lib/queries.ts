import "server-only";

import { db } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import {
  availability,
  competitions,
  regions,
  states,
  user,
} from "@workspace/db/schema";

export async function getCompetitionsForRegion(regionFilter?: string) {
  const compsRaw = await db
    .select()
    .from(competitions)
    .innerJoin(states, eq(competitions.stateId, states.id))
    .innerJoin(regions, eq(states.regionId, regions.id))
    .where(regionFilter ? eq(regions.id, regionFilter) : undefined)
    .orderBy(asc(competitions.startDate));

  return compsRaw.map((row) => ({
    ...row.competition,
    state: { ...row.state, region: { ...row.region } },
  }));
}

export async function getAvailabilityDates(regionFilter?: string) {
  return db
    .selectDistinct({ date: availability.date })
    .from(availability)
    .innerJoin(user, eq(availability.userWcaId, user.wcaId))
    .innerJoin(regions, eq(user.regionId, regions.id))
    .innerJoin(states, eq(regions.id, states.regionId))
    .where(regionFilter ? eq(regions.id, regionFilter) : undefined)
    .orderBy(asc(availability.date));
}

export async function getHolidays() {
  return db.query.holidays.findMany();
}

export async function getRegions() {
  return db.query.regions.findMany({
    orderBy: (t, { asc }) => [asc(t.displayName)],
  });
}
