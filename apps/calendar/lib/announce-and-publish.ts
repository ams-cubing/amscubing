import {
  buildAnnouncementCaption,
  publishToTorneoDeRubik,
} from "@/lib/meta-publish";
import {
  fetchWcaCompetition,
  normalizeWcaCompetitionUrl,
} from "@/lib/wca-competition";

export type AnnounceSocialPublishInput = {
  wcaCompetitionUrl: string;
  city: string;
  name: string | null;
  startDate: string;
  endDate: string;
};

export type AnnounceSocialPublishResult =
  | {
      ok: true;
      wcaCompetitionUrl: string;
      facebookPostId: string;
      instagramMediaId: string | null;
      displayName: string;
    }
  | { ok: false; message: string };

/**
 * Validates that the WCA URL is a real competition, then publishes to
 * Torneo de Rubik FB (and IG when a logo exists). Does not touch the DB.
 */
export async function publishCompetitionSocialAnnouncement(
  input: AnnounceSocialPublishInput,
): Promise<AnnounceSocialPublishResult> {
  const rawUrl = input.wcaCompetitionUrl?.trim() ?? "";
  if (!rawUrl) {
    return {
      ok: false,
      message:
        "Debes agregar la URL de la competencia en la WCA antes de anunciar.",
    };
  }

  const wcaCompetitionUrl = normalizeWcaCompetitionUrl(rawUrl);

  const wca = await fetchWcaCompetition(wcaCompetitionUrl);
  if (!wca.ok) {
    return { ok: false, message: wca.message };
  }

  const displayName =
    wca.competition.shortName ??
    wca.competition.name ??
    input.name ??
    `Competencia en ${input.city}`;

  const caption = buildAnnouncementCaption({
    name: displayName,
    city: input.city,
    startDate: input.startDate,
    endDate: input.endDate,
    wcaUrl: wca.competition.url,
  });

  const published = await publishToTorneoDeRubik({
    caption,
    linkUrl: wca.competition.url,
    imageUrl: wca.competition.logoUrl,
  });

  if (!published.ok) {
    return { ok: false, message: published.message };
  }

  return {
    ok: true,
    wcaCompetitionUrl: wca.competition.url,
    facebookPostId: published.facebookPostId,
    instagramMediaId: published.instagramMediaId,
    displayName,
  };
}
