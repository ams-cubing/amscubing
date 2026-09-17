import { extractFirstImageUrl } from "./competition-logo";

export type WcaCompetitionDetails = {
  id: string;
  name: string | null;
  shortName: string | null;
  information: string | null;
  url: string;
  /** First image from WCA information, if any. */
  logoUrl: string | null;
  city: string | null;
  venueName: string | null;
  venueAddress: string | null;
  venueDetails: string | null;
  eventIds: string[];
  competitorLimit: number | null;
};

export function extractWcaCompetitionId(
  wcaCompetitionUrl: string,
): string | null {
  const match = wcaCompetitionUrl.match(/competitions\/([^/?#]+)/);
  return match?.[1] ?? null;
}

export function normalizeWcaCompetitionUrl(url: string): string {
  const trimmed = url.trim();
  const id = extractWcaCompetitionId(trimmed);
  if (id) {
    return `https://www.worldcubeassociation.org/competitions/${id}`;
  }
  return trimmed;
}

/** Fetches a real WCA competition by URL. Logo is optional. */
export async function fetchWcaCompetition(
  wcaCompetitionUrl: string,
): Promise<
  | { ok: true; competition: WcaCompetitionDetails }
  | { ok: false; message: string }
> {
  const id = extractWcaCompetitionId(wcaCompetitionUrl);
  if (!id) {
    return {
      ok: false,
      message:
        "La URL de la WCA no es válida. Usa un enlace como https://www.worldcubeassociation.org/competitions/...",
    };
  }

  try {
    const response = await fetch(
      `https://www.worldcubeassociation.org/api/v0/competitions/${id}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        ok: false,
        message: `No se pudo obtener la competencia de la WCA (${response.status}). Verifica la URL.`,
      };
    }

    const data = (await response.json()) as {
      id?: string;
      name?: string | null;
      short_name?: string | null;
      information?: string | null;
      url?: string;
      city?: string | null;
      venue?: string | null;
      venue_address?: string | null;
      venue_details?: string | null;
      event_ids?: string[] | null;
      competitor_limit?: number | null;
    };

    const venueFromHtml = stripHtml(data.venue);
    const venueName = venueFromHtml || null;
    const venueAddress =
      typeof data.venue_address === "string" && data.venue_address.trim()
        ? data.venue_address.trim()
        : null;
    const venueDetails =
      typeof data.venue_details === "string" && data.venue_details.trim()
        ? data.venue_details.trim()
        : null;

    return {
      ok: true,
      competition: {
        id: data.id ?? id,
        name: data.name ?? null,
        shortName: data.short_name ?? null,
        information: data.information ?? null,
        url:
          data.url ?? `https://www.worldcubeassociation.org/competitions/${id}`,
        logoUrl: extractFirstImageUrl(data.information),
        city: data.city?.trim() || null,
        venueName,
        venueAddress,
        venueDetails,
        eventIds: Array.isArray(data.event_ids) ? data.event_ids : [],
        competitorLimit:
          typeof data.competitor_limit === "number" && data.competitor_limit > 0
            ? data.competitor_limit
            : null,
      },
    };
  } catch (error) {
    console.error("Error fetching WCA competition:", error);
    return {
      ok: false,
      message: "Error al consultar la API de la WCA. Inténtalo de nuevo.",
    };
  }
}

function stripHtml(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : null;
}
