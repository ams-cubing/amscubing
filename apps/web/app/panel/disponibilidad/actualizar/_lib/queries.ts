import "server-only";

import { db } from "@/db";

export async function getUserAvailability(wcaId: string) {
  return db.query.availability.findMany({
    where: (availability, { eq }) => eq(availability.userWcaId, wcaId),
    columns: {
      date: true,
    },
  });
}

export async function getDelegateBusyDays(wcaId: string) {
  const delegateCompetitionRows = await db.query.competitionDelegates.findMany({
    where: (cd, { eq }) => eq(cd.delegateWcaId, wcaId),
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

  const delegateBusyDaysSet = new Set<string>();
  for (const comp of delegateBusyCompetitions) {
    if (!comp?.startDate || !comp?.endDate) continue;
    const start = new Date(comp.startDate);
    const end = new Date(comp.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      delegateBusyDaysSet.add(d.toISOString().slice(0, 10));
    }
  }

  return Array.from(delegateBusyDaysSet).sort();
}
