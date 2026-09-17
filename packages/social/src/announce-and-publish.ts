import {
  buildAnnouncementCaption,
  publishInstagramOnly,
  publishToTorneoDeRubik,
} from "./meta-publish";
import {
  fetchWcaCompetition,
  normalizeWcaCompetitionUrl,
} from "./wca-competition";

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

export type AnnouncementPreviewResult =
  | {
      ok: true;
      displayName: string;
      wcaUrl: string;
      logoUrl: string | null;
      caption: string;
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

/** Build caption + logo preview from live WCA data (no Meta publish). */
export async function buildAnnouncementPreview(
  input: AnnounceSocialPublishInput,
): Promise<AnnouncementPreviewResult> {
  const rawUrl = input.wcaCompetitionUrl?.trim() ?? "";
  if (!rawUrl) {
    return {
      ok: false,
      message: "Falta la URL de la competencia en la WCA.",
    };
  }

  const wca = await fetchWcaCompetition(normalizeWcaCompetitionUrl(rawUrl));
  if (!wca.ok) {
    return { ok: false, message: wca.message };
  }

  const displayName =
    wca.competition.shortName ??
    wca.competition.name ??
    input.name ??
    `Competencia en ${input.city}`;

  return {
    ok: true,
    displayName,
    wcaUrl: wca.competition.url,
    logoUrl: wca.competition.logoUrl,
    caption: buildAnnouncementCaption({
      name: displayName,
      city: input.city,
      startDate: input.startDate,
      endDate: input.endDate,
      wcaUrl: wca.competition.url,
    }),
  };
}

/**
 * Complete Instagram for a competition that already has a Facebook post,
 * when a WCA logo is now available.
 */
export async function completeInstagramAnnouncement(
  input: AnnounceSocialPublishInput,
): Promise<
  | { ok: true; instagramMediaId: string; displayName: string }
  | { ok: false; message: string }
> {
  const preview = await buildAnnouncementPreview(input);
  if (!preview.ok) {
    return { ok: false, message: preview.message };
  }

  if (!preview.logoUrl) {
    return {
      ok: false,
      message:
        "La competencia en la WCA aún no tiene logo. Agrégalo en la información WCA e inténtalo de nuevo.",
    };
  }

  const published = await publishInstagramOnly({
    caption: preview.caption,
    imageUrl: preview.logoUrl,
  });

  if (!published.ok) {
    return { ok: false, message: published.message };
  }

  return {
    ok: true,
    instagramMediaId: published.mediaId,
    displayName: preview.displayName,
  };
}
