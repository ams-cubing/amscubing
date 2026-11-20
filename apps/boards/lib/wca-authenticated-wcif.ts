import { extractWcaCompetitionId } from "@workspace/social";
import { isDeliverableEmail } from "@workspace/email";
import { log } from "@workspace/server/log";

const WCA_API = "https://www.worldcubeassociation.org/api/v0/competitions";

export type AuthenticatedWcifPerson = {
  name?: string | null;
  email?: string | null;
  wcaId?: string | null;
  registration?: {
    status?: string | null;
    isCompeting?: boolean | null;
  } | null;
};

export type AuthenticatedWcif = {
  id: string;
  name?: string | null;
  persons?: AuthenticatedWcifPerson[] | null;
};

export type CompetitorRecipient = {
  name: string;
  email: string;
};

export type FetchAuthenticatedWcifResult =
  | { ok: true; wcif: AuthenticatedWcif }
  | {
      ok: false;
      reason: "unauthorized" | "forbidden" | "not_found" | "error";
      message: string;
    };

/** Accepted competitors who are competing (missing isCompeting counts as true). */
export function competitorRecipientsFromWcif(
  persons: AuthenticatedWcifPerson[] | null | undefined,
): CompetitorRecipient[] {
  const seen = new Set<string>();
  const recipients: CompetitorRecipient[] = [];

  for (const person of persons ?? []) {
    const registration = person.registration;
    if (!registration || registration.status !== "accepted") continue;
    if (registration.isCompeting === false) continue;
    if (!isDeliverableEmail(person.email)) continue;

    const email = person.email.trim().toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);

    recipients.push({
      name: person.name?.trim() || "Competidor",
      email,
    });
  }

  return recipients;
}

export async function fetchAuthenticatedWcif(
  wcaCompetitionId: string,
  accessToken: string,
): Promise<FetchAuthenticatedWcifResult> {
  let response: Response;
  try {
    response = await fetch(
      `${WCA_API}/${encodeURIComponent(wcaCompetitionId)}/wcif`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );
  } catch (error) {
    log.error("wca.authenticated_wcif_network", {
      competitionId: wcaCompetitionId,
      error,
    });
    return {
      ok: false,
      reason: "error",
      message: "No se pudo consultar el WCIF autenticado de la WCA.",
    };
  }

  if (response.status === 401) {
    return {
      ok: false,
      reason: "unauthorized",
      message:
        "Tu sesión WCA no es válida. Vuelve a vincular WCA desde Cuenta (incluye manage_competitions).",
    };
  }
  if (response.status === 403) {
    return {
      ok: false,
      reason: "forbidden",
      message:
        "Tu cuenta WCA no puede administrar esta competencia. Debe ser organizador o delegado en la WCA.",
    };
  }
  if (response.status === 404) {
    return {
      ok: false,
      reason: "not_found",
      message: "No se encontró el WCIF de esa competencia en la WCA.",
    };
  }
  if (!response.ok) {
    log.warn("wca.authenticated_wcif_failed", {
      competitionId: wcaCompetitionId,
      status: response.status,
    });
    return {
      ok: false,
      reason: "error",
      message: "No se pudo leer el WCIF autenticado. Inténtalo de nuevo.",
    };
  }

  const wcif = (await response.json()) as AuthenticatedWcif;
  return { ok: true, wcif };
}

export function wcaCompetitionIdFromUrl(wcaCompetitionUrl: string | null | undefined) {
  if (!wcaCompetitionUrl?.trim()) return null;
  return extractWcaCompetitionId(wcaCompetitionUrl);
}
