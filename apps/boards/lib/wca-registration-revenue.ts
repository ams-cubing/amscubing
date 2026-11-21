import { extractWcaCompetitionId } from "@workspace/social";
import { log } from "@workspace/server/log";

const WCA_API = "https://www.worldcubeassociation.org/api/v0/competitions";

/** WCIF roles that usually do not pay the entry fee. */
export const FREE_ENTRY_WCIF_ROLES = new Set([
  "delegate",
  "trainee-delegate",
  "organizer",
]);

type WcifRegistration = {
  status?: string | null;
  isCompeting?: boolean | null;
};

type WcifPerson = {
  name?: string;
  wcaId?: string | null;
  roles?: string[] | null;
  registration?: WcifRegistration | null;
};

export type WcaRegistrationRevenueEstimate = {
  competitionId: string;
  currencyCode: string | null;
  /** Base entry fee from WCA (lowest denomination), when currency is MXN. */
  wcaFeeCents: number | null;
  /** Fee used for the estimate (WCA MXN fee, else budget fallback). */
  feeCents: number;
  feeSource: "wca" | "budget";
  acceptedCompeting: number;
  excludedStaff: number;
  payingCompetitors: number;
  revenueCents: number;
};

function hasFreeEntryRole(roles: string[] | null | undefined) {
  for (const role of roles ?? []) {
    if (FREE_ENTRY_WCIF_ROLES.has(role)) return true;
  }
  return false;
}

/** Count accepted competing people who are not delegates/organizers. */
export function countPayingCompetitors(persons: WcifPerson[]) {
  let acceptedCompeting = 0;
  let excludedStaff = 0;
  let payingCompetitors = 0;

  for (const person of persons) {
    const registration = person.registration;
    if (!registration || registration.status !== "accepted") continue;
    if (registration.isCompeting === false) continue;

    acceptedCompeting += 1;
    if (hasFreeEntryRole(person.roles)) {
      excludedStaff += 1;
      continue;
    }
    payingCompetitors += 1;
  }

  return { acceptedCompeting, excludedStaff, payingCompetitors };
}

export async function fetchWcaRegistrationRevenueEstimate(opts: {
  wcaCompetitionUrl: string;
  /** Fallback when WCA fee is missing or not MXN. */
  budgetFeeCents: number;
}): Promise<
  | { ok: true; estimate: WcaRegistrationRevenueEstimate }
  | { ok: false; message: string }
> {
  const id = extractWcaCompetitionId(opts.wcaCompetitionUrl);
  if (!id) {
    return {
      ok: false,
      message:
        "Falta la URL de la WCA en la tarjeta Sitio web para consultar inscritos.",
    };
  }

  try {
    const [compRes, wcifRes] = await Promise.all([
      fetch(`${WCA_API}/${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
      fetch(`${WCA_API}/${encodeURIComponent(id)}/wcif/public`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
    ]);

    if (compRes.status === 404 || wcifRes.status === 404) {
      return {
        ok: false,
        message:
          "La competencia aún no es pública en la WCA (o su ID cambió).",
      };
    }
    if (!compRes.ok || !wcifRes.ok) {
      return {
        ok: false,
        message: "No se pudo consultar la WCA. Inténtalo de nuevo.",
      };
    }

    const competition = (await compRes.json()) as {
      id?: string;
      currency_code?: string | null;
      base_entry_fee_lowest_denomination?: number | null;
    };
    const wcif = (await wcifRes.json()) as { persons?: WcifPerson[] | null };
    const counts = countPayingCompetitors(wcif.persons ?? []);

    const currencyCode = competition.currency_code?.trim().toUpperCase() || null;
    const rawFee = competition.base_entry_fee_lowest_denomination;
    const wcaFeeCents =
      currencyCode === "MXN" &&
      typeof rawFee === "number" &&
      Number.isFinite(rawFee) &&
      rawFee >= 0
        ? Math.round(rawFee)
        : null;

    const feeSource: "wca" | "budget" =
      wcaFeeCents != null ? "wca" : "budget";
    const feeCents =
      feeSource === "wca" ? wcaFeeCents! : Math.max(0, opts.budgetFeeCents);

    if (feeCents <= 0) {
      return {
        ok: false,
        message:
          "La WCA no tiene cuota en MXN y el presupuesto no tiene cuota propuesta.",
      };
    }

    return {
      ok: true,
      estimate: {
        competitionId: competition.id ?? id,
        currencyCode,
        wcaFeeCents,
        feeCents,
        feeSource,
        acceptedCompeting: counts.acceptedCompeting,
        excludedStaff: counts.excludedStaff,
        payingCompetitors: counts.payingCompetitors,
        revenueCents: feeCents * counts.payingCompetitors,
      },
    };
  } catch (error) {
    log.error("boards.wca_registration_revenue_failed", {
      error: error instanceof Error ? error.message : String(error),
      competitionId: id,
    });
    return {
      ok: false,
      message: "Error al consultar la WCA. Inténtalo de nuevo.",
    };
  }
}
