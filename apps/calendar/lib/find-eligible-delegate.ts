import "server-only";

import { db } from "@workspace/db";
import {
  competitionDelegates,
  competitions,
  dateRequests,
  regions,
  states,
  user,
} from "@workspace/db/schema";
import { hasWcaId } from "@workspace/db/utils";
import { and, eq, gte, inArray, isNotNull, lte, notInArray } from "drizzle-orm";

import { dateRangeStrings } from "@/lib/availability-dates";

export type EligibleDelegate = {
  id: string;
  wcaId: string;
  name: string;
  email: string;
  role: "delegate" | "user" | "editor";
};

export type ReassignmentCandidate = EligibleDelegate & {
  regionId: string | null;
  regionDisplayName: string | null;
  availableDays: number;
  requiredDays: number;
  eligible: boolean;
  inRegion: boolean;
};

type EligibleExecutor = Pick<typeof db, "query" | "select">;

type DelegateCandidate = EligibleDelegate & {
  regionId: string | null;
};

async function loadDelegateCandidates(
  input: {
    regionId: string;
    excludeWcaIds: string[];
    /** When true, load all delegates (region preferred first). When false, regional then national fallback like findEligibleDelegate. */
    allDelegates: boolean;
  },
  executor: EligibleExecutor,
): Promise<DelegateCandidate[]> {
  const exclude = input.excludeWcaIds.filter(Boolean);

  if (input.allDelegates) {
    const all = await executor.query.user.findMany({
      where: and(
        eq(user.role, "delegate"),
        exclude.length > 0 ? notInArray(user.wcaId, exclude) : undefined,
      ),
      columns: {
        id: true,
        wcaId: true,
        name: true,
        email: true,
        role: true,
        regionId: true,
      },
    });

    const withWca = all.filter(hasWcaId);
    const inRegion = withWca.filter((c) => c.regionId === input.regionId);
    const outOfRegion = withWca.filter((c) => c.regionId !== input.regionId);
    return [...inRegion, ...outOfRegion];
  }

  let candidates = await executor.query.user.findMany({
    where: and(
      eq(user.regionId, input.regionId),
      eq(user.role, "delegate"),
      exclude.length > 0 ? notInArray(user.wcaId, exclude) : undefined,
    ),
    columns: {
      id: true,
      wcaId: true,
      name: true,
      email: true,
      role: true,
      regionId: true,
    },
  });

  if (candidates.length === 0) {
    candidates = await executor.query.user.findMany({
      where: and(
        eq(user.role, "delegate"),
        exclude.length > 0 ? notInArray(user.wcaId, exclude) : undefined,
      ),
      columns: {
        id: true,
        wcaId: true,
        name: true,
        email: true,
        role: true,
        regionId: true,
      },
    });
  }

  return candidates.filter(hasWcaId);
}

async function evaluateDelegateEligibility(
  candidate: { wcaId: string },
  input: { startDate: string; endDate: string },
  daysCount: number,
  executor: EligibleExecutor,
): Promise<{ availableDays: number; eligible: boolean }> {
  const availRows = await executor.query.availability.findMany({
    where: (a, { and: andFn, eq: eqFn, gte: gteFn, lte: lteFn }) =>
      andFn(
        eqFn(a.userWcaId, candidate.wcaId),
        gteFn(a.date, input.startDate),
        lteFn(a.date, input.endDate),
      ),
    columns: { date: true },
  });

  const availableDays = availRows.length;
  if (availableDays !== daysCount) {
    return { availableDays, eligible: false };
  }

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

  if (overlappingCompetition.length > 0) {
    return { availableDays, eligible: false };
  }

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

  if (overlappingDateRequest.length > 0) {
    return { availableDays, eligible: false };
  }

  return { availableDays, eligible: true };
}

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

  const candidates = await loadDelegateCandidates(
    {
      regionId: state.regionId,
      excludeWcaIds: input.excludeWcaIds ?? [],
      allDelegates: false,
    },
    executor,
  );

  for (const candidate of candidates) {
    const { eligible } = await evaluateDelegateEligibility(
      candidate,
      input,
      daysCount,
      executor,
    );
    if (eligible) {
      return {
        id: candidate.id,
        wcaId: candidate.wcaId,
        name: candidate.name,
        email: candidate.email,
        role: candidate.role,
      };
    }
  }

  return null;
}

export async function listDelegatesForReassignment(
  input: {
    stateId: string;
    startDate: string;
    endDate: string;
    excludeWcaIds?: string[];
  },
  executor: EligibleExecutor = db,
): Promise<ReassignmentCandidate[]> {
  const state = await executor.query.states.findFirst({
    where: eq(states.id, input.stateId),
    columns: { regionId: true },
  });

  if (!state) {
    return [];
  }

  const daysCount = dateRangeStrings(input.startDate, input.endDate).length;
  if (daysCount === 0) {
    return [];
  }

  const candidates = await loadDelegateCandidates(
    {
      regionId: state.regionId,
      excludeWcaIds: input.excludeWcaIds ?? [],
      allDelegates: true,
    },
    executor,
  );

  const regionRows = await executor
    .select({ id: regions.id, displayName: regions.displayName })
    .from(regions);
  const regionById = new Map(regionRows.map((r) => [r.id, r.displayName]));

  const results: ReassignmentCandidate[] = [];

  for (const candidate of candidates) {
    const { availableDays, eligible } = await evaluateDelegateEligibility(
      candidate,
      input,
      daysCount,
      executor,
    );

    results.push({
      id: candidate.id,
      wcaId: candidate.wcaId,
      name: candidate.name,
      email: candidate.email,
      role: candidate.role,
      regionId: candidate.regionId,
      regionDisplayName: candidate.regionId
        ? (regionById.get(candidate.regionId) ?? null)
        : null,
      availableDays,
      requiredDays: daysCount,
      eligible,
      inRegion: candidate.regionId === state.regionId,
    });
  }

  return results.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (a.inRegion !== b.inRegion) return a.inRegion ? -1 : 1;
    return a.name.localeCompare(b.name, "es");
  });
}

export async function getEligibleReassignmentDelegate(
  input: {
    stateId: string;
    startDate: string;
    endDate: string;
    replacementWcaId: string;
    excludeWcaIds?: string[];
  },
  executor: EligibleExecutor = db,
): Promise<EligibleDelegate | null> {
  const exclude = new Set(input.excludeWcaIds?.filter(Boolean) ?? []);
  if (exclude.has(input.replacementWcaId)) {
    return null;
  }

  const candidates = await listDelegatesForReassignment(
    {
      stateId: input.stateId,
      startDate: input.startDate,
      endDate: input.endDate,
      excludeWcaIds: input.excludeWcaIds,
    },
    executor,
  );

  const match = candidates.find(
    (c) => c.wcaId === input.replacementWcaId && c.eligible,
  );
  if (!match) return null;

  return {
    id: match.id,
    wcaId: match.wcaId,
    name: match.name,
    email: match.email,
    role: match.role,
  };
}
