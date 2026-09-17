import { extractFirstImageUrl } from "@/lib/competition-logo";

export type WcaCompetitionDetails = {
  id: string;
  name: string | null;
  shortName: string | null;
  information: string | null;
  url: string;
  /** First image from WCA information, if any. */
  logoUrl: string | null;
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
        next: { revalidate: 0 },
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
    };

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

/** @deprecated Use fetchWcaCompetition */
export const fetchWcaCompetitionWithLogo = fetchWcaCompetition;
