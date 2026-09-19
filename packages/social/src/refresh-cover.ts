import { createHash } from "node:crypto";

import { and, asc, eq, gte } from "drizzle-orm";

import { db } from "@workspace/db";
import { competitions } from "@workspace/db/schema";

import {
  generateCoverPngFromInputs,
  type CoverSlotInput,
  COVER_MAX_SLOTS,
} from "./cover-image";
import { updateFacebookPageCover } from "./meta-publish";
import { fetchWcaCompetition } from "./wca-competition";

export type RefreshCoverResult =
  | {
      ok: true;
      message: string;
      slotCount: number;
      hash: string;
      skippedUnchanged?: boolean;
    }
  | { ok: false; message: string };

/** Best-effort in-process cache to avoid re-uploading an identical cover. */
let lastUploadedCoverHash: string | null = null;

function todayMexicoIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function listCoverCompetitionInputs(): Promise<CoverSlotInput[]> {
  const today = todayMexicoIsoDate();
  const rows = await db.query.competitions.findMany({
    where: and(
      eq(competitions.statusPublic, "announced"),
      gte(competitions.endDate, today),
    ),
    orderBy: [asc(competitions.startDate), asc(competitions.id)],
    columns: {
      city: true,
      startDate: true,
      endDate: true,
      wcaCompetitionUrl: true,
    },
    with: {
      state: { columns: { name: true } },
    },
    limit: COVER_MAX_SLOTS,
  });

  const slots: CoverSlotInput[] = await Promise.all(
    rows.map(async (row) => {
      let logoUrl: string | null = null;
      let registrationOpen: string | null = null;
      let registrationClose: string | null = null;

      const wcaUrl = row.wcaCompetitionUrl?.trim();
      if (wcaUrl) {
        const wca = await fetchWcaCompetition(wcaUrl);
        if (wca.ok) {
          logoUrl = wca.competition.logoUrl;
          registrationOpen = wca.competition.registrationOpen;
          registrationClose = wca.competition.registrationClose;
        }
      }

      return {
        city: row.city,
        stateName: row.state?.name ?? null,
        startDate: row.startDate,
        endDate: row.endDate,
        logoUrl,
        registrationOpen,
        registrationClose,
      };
    }),
  );

  return slots;
}

/** Generate the current cover PNG without uploading to Meta. */
export async function generateTorneoDeRubikCoverPng(): Promise<
  | { ok: true; png: Buffer; hash: string; slotCount: number }
  | { ok: false; message: string }
> {
  try {
    const inputs = await listCoverCompetitionInputs();
    const generated = await generateCoverPngFromInputs(inputs);
    return {
      ok: true,
      png: generated.png,
      hash: generated.hash,
      slotCount: generated.slotCount,
    };
  } catch (error) {
    console.error("Failed to generate Torneo de Rubik cover:", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo generar la portada.",
    };
  }
}

/**
 * Regenerate the Torneo de Rubik Facebook page cover from announced competitions.
 * Safe to call after announce; skips Meta upload when the PNG hash is unchanged.
 */
export async function refreshTorneoDeRubikCover(options?: {
  force?: boolean;
}): Promise<RefreshCoverResult> {
  const generated = await generateTorneoDeRubikCoverPng();
  if (!generated.ok) {
    return generated;
  }

  if (
    !options?.force &&
    lastUploadedCoverHash &&
    lastUploadedCoverHash === generated.hash
  ) {
    return {
      ok: true,
      message: "Portada sin cambios; no se re-subió a Facebook.",
      slotCount: generated.slotCount,
      hash: generated.hash,
      skippedUnchanged: true,
    };
  }

  const uploaded = await updateFacebookPageCover(generated.png);
  if (!uploaded.ok) {
    return uploaded;
  }

  lastUploadedCoverHash = generated.hash;
  return {
    ok: true,
    message:
      generated.slotCount === 0
        ? "Portada actualizada (sin competencias anunciadas)."
        : `Portada actualizada con ${generated.slotCount} competencia${generated.slotCount === 1 ? "" : "s"}.`,
    slotCount: generated.slotCount,
    hash: generated.hash,
  };
}

/** Best-effort cover refresh; never throws. Logs failures. */
export async function refreshTorneoDeRubikCoverBestEffort(): Promise<void> {
  try {
    const result = await refreshTorneoDeRubikCover();
    if (!result.ok) {
      console.error("Torneo de Rubik cover refresh failed:", result.message);
      return;
    }
    if (result.skippedUnchanged) {
      console.info(
        "Torneo de Rubik cover unchanged:",
        result.hash.slice(0, 12),
      );
      return;
    }
    console.info("Torneo de Rubik cover updated:", result.message);
  } catch (error) {
    console.error("Torneo de Rubik cover refresh threw:", error);
  }
}

/** Test helper: reset in-memory hash cache. */
export function resetCoverHashCacheForTests(): void {
  lastUploadedCoverHash = null;
}

export function coverInputsFingerprint(inputs: CoverSlotInput[]): string {
  return createHash("sha256").update(JSON.stringify(inputs)).digest("hex");
}
