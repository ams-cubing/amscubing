import "server-only";

import { and, count, eq, ne } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  competitionDelegates,
  competitions,
  dateRequests,
} from "@workspace/db/schema";

import type { DelegatePanelBadges } from "@/lib/delegate-panel-nav";

export async function getDelegatePanelBadges(
  wcaId: string,
): Promise<DelegatePanelBadges> {
  const [[dateRequestsRow], [competitionsRow]] = await Promise.all([
    db
      .select({ value: count() })
      .from(dateRequests)
      .where(
        and(
          eq(dateRequests.status, "open"),
          eq(dateRequests.proposedDelegateWcaId, wcaId),
        ),
      ),
    db
      .select({ value: count() })
      .from(competitionDelegates)
      .innerJoin(
        competitions,
        eq(competitionDelegates.competitionId, competitions.id),
      )
      .where(
        and(
          eq(competitionDelegates.delegateWcaId, wcaId),
          eq(competitionDelegates.status, "pending"),
          ne(competitions.statusInternal, "cancelled"),
        ),
      ),
  ]);

  const dateRequestCount = Number(dateRequestsRow?.value ?? 0);
  const competitionCount = Number(competitionsRow?.value ?? 0);

  return {
    dateRequests: dateRequestCount,
    competitions: competitionCount,
    total: dateRequestCount + competitionCount,
  };
}
