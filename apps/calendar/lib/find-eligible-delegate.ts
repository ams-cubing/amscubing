import "server-only";

import { db } from "@workspace/db";
import {
  competitionDelegates,
  competitions,
  dateRequests,
  states,
  user,
} from "@workspace/db/schema";
import { and, eq, gte, inArray, isNotNull, lte, notInArray } from "drizzle-orm";

import { dateRangeStrings } from "@/lib/availability-dates";

export type EligibleDelegate = {
  id: string;
  wcaId: string;
  name: string;
  email: string;
  role: "delegate" | "user" | "editor";
};

type EligibleExecutor = Pick<typeof db, "query" | "select">;

export async function findEligibleDelegate(
  input: {
    stateId: string;
    startDate: string;
    endDate: string;
    excludeWcaIds?: string[];
  },
  executor: EligibleExecutor = db,
): Promise<EligibleDelegate | null> {
  const state = await executor.query.states.findFirst({
    where: eq(states.id, input.stateId),
    columns: { regionId: true },
  });

  if (!state) {
    return null;
  }

  const daysCount = dateRangeStrings(input.startDate, input.endDate).length;
  if (daysCount === 0) {
    return null;
  }

  const excludeWcaIds = input.excludeWcaIds?.filter(Boolean) ?? [];

  let candidates = await executor.query.user.findMany({
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
    candidates = await executor.query.user.findMany({
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
    const availRows = await executor.query.availability.findMany({
      where: (a, { and: andFn, eq: eqFn, gte: gteFn, lte: lteFn }) =>
        andFn(
          eqFn(a.userWcaId, candidate.wcaId),
          gteFn(a.date, input.startDate),
          lteFn(a.date, input.endDate),
        ),
      columns: { date: true },
    });

    if (availRows.length !== daysCount) continue;

    const overlappingCompetition = await executor
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

    if (overlappingCompetition.length > 0) continue;

    const overlappingDateRequest = await executor
      .select({ id: dateRequests.id })
      .from(dateRequests)
      .where(
        and(
          eq(dateRequests.status, "open"),
          eq(dateRequests.proposedDelegateWcaId, candidate.wcaId),
          isNotNull(dateRequests.proposedDelegateWcaId),
          lte(dateRequests.startDate, input.endDate),
          gte(dateRequests.endDate, input.startDate),
        ),
      )
      .limit(1);

    if (overlappingDateRequest.length > 0) continue;

    return candidate;
  }

  return null;
}
