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
  stateName?: string | null;
  name: string | null;
  startDate: string;
  endDate: string;
  capacity?: number | null;
  /** Required before announce. */
  socialCustomText: string;
  socialTags?: string | null;
  socialFlyerUrl?: string | null;
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
      /** Prefer flyer, else WCA logo. */
      imageUrl: string | null;
      logoUrl: string | null;
      flyerUrl: string | null;
      caption: string;
    }
  | { ok: false; message: string };

function requireCustomText(
  customText: string | null | undefined,
): { ok: true; text: string } | { ok: false; message: string } {
  const text = customText?.trim() ?? "";
  if (!text) {
    return {
      ok: false,
      message:
        "Falta el texto personalizado del post. Complétalo en la tarjeta «Publicación redes Torneo de Rubik» del tablero.",
    };
  }
  return { ok: true, text };
}

function resolveImageUrl(flyerUrl: string | null | undefined, logoUrl: string | null) {
  const flyer = flyerUrl?.trim() || null;
  return flyer || logoUrl || null;
}

/**
 * Validates WCA URL + required custom text, then publishes to Torneo de Rubik.
 * Image: flyer → WCA logo → FB link-only.
 */
export async function publishCompetitionSocialAnnouncement(
  input: AnnounceSocialPublishInput,
): Promise<AnnounceSocialPublishResult> {
  const custom = requireCustomText(input.socialCustomText);
  if (!custom.ok) {
    return { ok: false, message: custom.message };
  }

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
    stateName: input.stateName,
    startDate: input.startDate,
    endDate: input.endDate,
    wcaUrl: wca.competition.url,
    customText: custom.text,
    tags: input.socialTags,
    venueName: wca.competition.venueName,
    venueAddress: wca.competition.venueAddress,
    venueDetails: wca.competition.venueDetails,
    eventIds: wca.competition.eventIds,
    competitorLimit: wca.competition.competitorLimit,
    capacityFallback: input.capacity,
  });

  const published = await publishToTorneoDeRubik({
    caption,
    linkUrl: wca.competition.url,
    imageUrl: resolveImageUrl(input.socialFlyerUrl, wca.competition.logoUrl),
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

/** Build caption + image preview from live WCA data (no Meta publish). */
export async function buildAnnouncementPreview(
  input: AnnounceSocialPublishInput,
): Promise<AnnouncementPreviewResult> {
  const custom = requireCustomText(input.socialCustomText);
  if (!custom.ok) {
    return { ok: false, message: custom.message };
  }

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

  const flyerUrl = input.socialFlyerUrl?.trim() || null;
  const logoUrl = wca.competition.logoUrl;

  return {
    ok: true,
    displayName,
    wcaUrl: wca.competition.url,
    imageUrl: resolveImageUrl(flyerUrl, logoUrl),
    logoUrl,
    flyerUrl,
    caption: buildAnnouncementCaption({
      name: displayName,
      city: input.city,
      stateName: input.stateName,
      startDate: input.startDate,
      endDate: input.endDate,
      wcaUrl: wca.competition.url,
      customText: custom.text,
      tags: input.socialTags,
      venueName: wca.competition.venueName,
      venueAddress: wca.competition.venueAddress,
      venueDetails: wca.competition.venueDetails,
      eventIds: wca.competition.eventIds,
      competitorLimit: wca.competition.competitorLimit,
      capacityFallback: input.capacity,
    }),
  };
}

/**
 * Complete Instagram when FB already exists and an image (flyer or logo) is available.
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

  if (!preview.imageUrl) {
    return {
      ok: false,
      message:
        "Se necesita un flyer o logo de la competencia para publicar en Instagram.",
    };
  }

  const published = await publishInstagramOnly({
    caption: preview.caption,
    imageUrl: preview.imageUrl,
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
