import { extractWcaCompetitionId } from "@workspace/social";
import { isDeliverableEmail } from "@workspace/email";
import { log } from "@workspace/server/log";

const WCA_API = "https://www.worldcubeassociation.org/api/v0/competitions";

export type AuthenticatedWcifPerson = {
  name?: string | null;
  email?: string | null;
  wcaId?: string | null;
  registrantId?: number | null;
  birthdate?: string | null;
  gender?: string | null;
  countryIso2?: string | null;
  registration?: {
    status?: string | null;
    isCompeting?: boolean | null;
    eventIds?: string[] | null;
  } | null;
};

export type CheckInCompetitorRow = {
  registrantId: number | null;
  name: string;
  wcaId: string | null;
  isNew: boolean;
  birthdate: string | null;
  gender: string | null;
  countryIso2: string | null;
  eventIds: string[];
};

/** Accepted competing people for check-in worksheets (no email required). */
export function checkInRowsFromWcif(
  persons: AuthenticatedWcifPerson[] | null | undefined,
): CheckInCompetitorRow[] {
  const rows: CheckInCompetitorRow[] = [];

  for (const person of persons ?? []) {
    const registration = person.registration;
    if (!registration || registration.status !== "accepted") continue;
    if (registration.isCompeting === false) continue;

    const wcaId = person.wcaId?.trim() || null;
    rows.push({
      registrantId:
        typeof person.registrantId === "number" ? person.registrantId : null,
      name: person.name?.trim() || "Competidor",
      wcaId,
      isNew: !wcaId,
      birthdate: person.birthdate?.trim() || null,
      gender: person.gender?.trim() || null,
      countryIso2: person.countryIso2?.trim().toUpperCase() || null,
      eventIds: [...(registration.eventIds ?? [])],
    });
  }

  rows.sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
  );
  return rows;
}

export function checkInRowsToCsv(rows: CheckInCompetitorRow[]) {
  const header = [
    "asistio",
    "kit_gafete",
    "datos_verificados",
    "registrant_id",
    "nombre",
    "wca_id",
    "es_nuevo",
    "fecha_nacimiento",
    "genero",
    "pais",
    "eventos",
  ];

  const escapeCell = (value: string) => {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replaceAll('"', '""')}"`;
    }
    return value;
  };

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        "",
        "",
        "",
        row.registrantId != null ? String(row.registrantId) : "",
        row.name,
        row.wcaId ?? "",
        row.isNew ? "si" : "no",
        row.birthdate ?? "",
        row.gender ?? "",
        row.countryIso2 ?? "",
        row.eventIds.join(","),
      ]
        .map(escapeCell)
        .join(","),
    );
  }

  // UTF-8 BOM helps Excel open accented names correctly.
  return `\uFEFF${lines.join("\n")}\n`;
}

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
        "No pudimos leer el WCIF con tu sesión WCA. En Cuenta usa «Volver a conectar WCA» y acepta todos los permisos.",
    };
  }
  if (response.status === 403) {
    return {
      ok: false,
      reason: "forbidden",
      message:
        "La WCA rechazó el acceso al WCIF. Confirma que eres organizador o delegado de esa competencia en la WCA, o vuelve a conectar WCA desde Cuenta.",
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
