import { syncCompetitionFromWca } from "@workspace/social";
import { log } from "@workspace/server/log";

/**
 * Best-effort WCA → AMS field sync after announce.
 * Failures are logged and returned; they must not roll back the announce.
 */
export async function syncAnnouncedCompetitionFromWcaBestEffort(input: {
  competitionId: number;
  actorId: string;
  wcaCompetitionUrl?: string | null;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await syncCompetitionFromWca({
      competitionId: input.competitionId,
      actorId: input.actorId,
      wcaCompetitionUrl: input.wcaCompetitionUrl,
      requireAnnounced: true,
    });
    if (!result.ok) {
      log.warn("calendar.wca_sync_after_announce_failed", {
        competitionId: input.competitionId,
        message: result.message,
      });
    }
    return { ok: result.ok, message: result.message };
  } catch (error) {
    log.error("calendar.wca_sync_after_announce_error", {
      competitionId: input.competitionId,
      error,
    });
    return {
      ok: false,
      message: "No se pudieron sincronizar los datos desde la WCA",
    };
  }
}
