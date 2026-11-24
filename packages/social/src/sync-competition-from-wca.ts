import { eq } from "drizzle-orm";

import { db } from "@workspace/db";
import {
  applyCompetitionWcaSync,
  type ApplyCompetitionWcaSyncResult,
} from "@workspace/db/sync-competition-from-wca";
import { competitions } from "@workspace/db/schema";
import { log } from "@workspace/server/log";

import {
  fetchWcaCompetition,
  normalizeWcaCompetitionUrl,
} from "./wca-competition";

/**
 * Fetch the public WCA competition and overwrite matching AMS fields.
 * Does not throw on WCA/network failure — returns `{ ok: false, message }`.
 */
export async function syncCompetitionFromWca(input: {
  competitionId: number;
  actorId: string;
  /** Prefer this URL when the row may still be mid-announce. */
  wcaCompetitionUrl?: string | null;
  requireAnnounced?: boolean;
}): Promise<ApplyCompetitionWcaSyncResult> {
  const row = await db.query.competitions.findFirst({
    where: eq(competitions.id, input.competitionId),
    columns: { wcaCompetitionUrl: true },
  });

  const rawUrl =
    input.wcaCompetitionUrl?.trim() || row?.wcaCompetitionUrl?.trim() || "";
  if (!rawUrl) {
    return {
      ok: false,
      updatedFields: [],
      message: "La competencia no tiene URL de la WCA",
    };
  }

  const wcaUrl = normalizeWcaCompetitionUrl(rawUrl);
  const fetched = await fetchWcaCompetition(wcaUrl);
  if (!fetched.ok) {
    log.warn("social.wca_sync_fetch_failed", {
      competitionId: input.competitionId,
      reason: fetched.reason,
    });
    return {
      ok: false,
      updatedFields: [],
      message: fetched.message,
    };
  }

  return applyCompetitionWcaSync({
    competitionId: input.competitionId,
    actorId: input.actorId,
    requireAnnounced: input.requireAnnounced,
    wca: {
      name: fetched.competition.name,
      shortName: fetched.competition.shortName,
      city: fetched.competition.city,
      startDate: fetched.competition.startDate,
      endDate: fetched.competition.endDate,
      competitorLimit: fetched.competition.competitorLimit,
      mainEventId: fetched.competition.mainEventId,
    },
  });
}
