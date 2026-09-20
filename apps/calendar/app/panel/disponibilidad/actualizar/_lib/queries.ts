import "server-only";

import { db } from "@workspace/db";
import { dateRequests } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

export async function getUserAvailability(wcaId: string) {
  return db.query.availability.findMany({
    where: (availability, { eq }) => eq(availability.userWcaId, wcaId),
    columns: {
      date: true,
    },
  });
}

function addDateRangeToSet(
  set: Set<string>,
  startDate: string,
  endDate: string,
) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    set.add(d.toISOString().slice(0, 10));
  }
}

export async function getDelegateBusyDays(wcaId: string) {
  const delegateCompetitionRows = await db.query.competitionDelegates.findMany({
    where: (cd, { and, eq, inArray }) =>
      and(
        eq(cd.delegateWcaId, wcaId),
        inArray(cd.status, ["pending", "accepted"]),
      ),
    columns: { competitionId: true },
  });

  const competitionIds = delegateCompetitionRows.map((r) => r.competitionId);

  const delegateBusyCompetitions =
    competitionIds.length > 0
      ? await db.query.competitions.findMany({
          where: (c, { inArray }) => inArray(c.id, competitionIds),
          columns: {
            startDate: true,
            endDate: true,
          },
        })
      : [];

  const openDateRequests = await db
    .select({
      startDate: dateRequests.startDate,
      endDate: dateRequests.endDate,
    })
    .from(dateRequests)
    .where(
      and(
        eq(dateRequests.status, "open"),
        eq(dateRequests.proposedDelegateWcaId, wcaId),
      ),
    );

  const delegateBusyDaysSet = new Set<string>();
  for (const comp of delegateBusyCompetitions) {
    if (!comp?.startDate || !comp?.endDate) continue;
    addDateRangeToSet(delegateBusyDaysSet, comp.startDate, comp.endDate);
  }
  for (const request of openDateRequests) {
    addDateRangeToSet(delegateBusyDaysSet, request.startDate, request.endDate);
  }

  return Array.from(delegateBusyDaysSet).sort();
}
