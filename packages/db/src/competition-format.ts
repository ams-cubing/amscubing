import { eq } from "drizzle-orm";

import {
  CompetitionFormatError,
  listWcaEvents,
  normalizeFormatInput,
  recommendedScramblers,
  recommendedStaffMinimum,
  type CompetitionFormat,
  type WcaEvent,
} from "./competition-format-rules";
import type { db } from "./index";
import {
  competitions,
  type CompetitionEventPlanItem,
} from "./schema/competitions";

export type { CompetitionEventPlanItem, CompetitionFormat, WcaEvent };
export {
  CompetitionFormatError,
  listWcaEvents,
  normalizeEventsPlan,
  normalizeFormatInput,
  recommendedScramblers,
  recommendedStaffMinimum,
  SCRAMBLER_DEMO_EVENT_IDS,
  WCA_EVENTS,
  isWcaEventId,
} from "./competition-format-rules";

type DbOrTx = Pick<typeof db, "select" | "update" | "query">;

export async function getCompetitionFormat(
  client: DbOrTx,
  competitionId: number,
): Promise<CompetitionFormat | null> {
  const row = await client.query.competitions.findFirst({
    where: eq(competitions.id, competitionId),
    columns: {
      stationCount: true,
      zoneCount: true,
      eventsPlan: true,
    },
  });
  if (!row) return null;
  return {
    stationCount: row.stationCount,
    zoneCount: row.zoneCount,
    eventsPlan: Array.isArray(row.eventsPlan) ? row.eventsPlan : [],
  };
}

export async function saveCompetitionFormat(
  client: DbOrTx,
  competitionId: number,
  input: {
    stationCount: number | null;
    zoneCount: number;
    eventsPlan: CompetitionEventPlanItem[];
  },
): Promise<CompetitionFormat> {
  const format = normalizeFormatInput(input);
  const updated = await client
    .update(competitions)
    .set({
      stationCount: format.stationCount,
      zoneCount: format.zoneCount,
      eventsPlan: format.eventsPlan,
      updatedAt: new Date(),
    })
    .where(eq(competitions.id, competitionId))
    .returning({ id: competitions.id });

  if (updated.length === 0) {
    throw new CompetitionFormatError("Competencia no encontrada");
  }

  return format;
}
