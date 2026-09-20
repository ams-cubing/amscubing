import "server-only";

import { db } from "@workspace/db";
import {
  competitionDelegates,
  competitions,
  states,
  user,
} from "@workspace/db/schema";
import { and, eq, gte, inArray, lte, notInArray } from "drizzle-orm";

export type EligibleDelegate = {
  id: string;
  wcaId: string;
  name: string;
  email: string;
  role: "delegate" | "user" | "editor";
};

export async function findEligibleDelegate(input: {
  stateId: string;
  startDate: string;
  endDate: string;
  excludeWcaIds?: string[];
}): Promise<EligibleDelegate | null> {
  const state = await db.query.states.findFirst({
    where: eq(states.id, input.stateId),
    columns: { regionId: true },
  });

  if (!state) {
    return null;
  }

  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const daysCount =
    Math.floor((end.getTime() - start.getTime()) / oneDayMs) + 1;

  const excludeWcaIds = input.excludeWcaIds?.filter(Boolean) ?? [];

  let candidates = await db.query.user.findMany({
    where: and(
      eq(user.regionId, state.regionId),
      eq(user.role, "delegate"),
      excludeWcaIds.length > 0
        ? notInArray(user.wcaId, excludeWcaIds)
        : undefined,
    ),
    columns: { id: true, wcaId: true, name: true, email: true, role: true },
  });

  if (candidates.length === 0) {
    candidates = await db.query.user.findMany({
      where: and(
        eq(user.role, "delegate"),
        excludeWcaIds.length > 0
          ? notInArray(user.wcaId, excludeWcaIds)
          : undefined,
      ),
      columns: { id: true, wcaId: true, name: true, email: true, role: true },
    });
  }

  for (const candidate of candidates) {
    const availRows = await db.query.availability.findMany({
      where: (a, { and: andFn, eq: eqFn, gte: gteFn, lte: lteFn }) =>
        andFn(
          eqFn(a.userWcaId, candidate.wcaId),
          gteFn(a.date, input.startDate),
          lteFn(a.date, input.endDate),
        ),
      columns: { date: true },
    });

    if (availRows.length !== daysCount) continue;

    const overlapping = await db
      .select({ competitionId: competitionDelegates.competitionId })
      .from(competitionDelegates)
      .innerJoin(
        competitions,
        eq(competitionDelegates.competitionId, competitions.id),
      )
      .where(
        and(
          eq(competitionDelegates.delegateWcaId, candidate.wcaId),
          inArray(competitionDelegates.status, ["pending", "accepted"]),
          lte(competitions.startDate, input.endDate),
          gte(competitions.endDate, input.startDate),
        ),
      )
      .limit(1);

    if (overlapping.length > 0) continue;

    return candidate;
  }

  return null;
}
