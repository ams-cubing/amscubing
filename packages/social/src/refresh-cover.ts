import { and, asc, eq, gte } from "drizzle-orm";

import { db } from "@workspace/db";
import {
  competitions,
  FACEBOOK_COVER_STATE_ID,
  facebookCoverState,
} from "@workspace/db/schema";

import {
  generateCoverPngFromInputs,
  type CoverSlotInput,
  COVER_MAX_SLOTS,
} from "./cover-image";
import {
  classifyCoverStatus,
  coverInputsFingerprint,
  type CoverStatus,
} from "./cover-fingerprint";
import {
  buildProximasCompetenciasCaption,
  updateFacebookPageCover,
  type ProximasCompetenciasCaptionItem,
} from "./meta-publish";
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

export type TorneoDeRubikCoverStatus = {
  status: CoverStatus;
  slotCount: number;
  uploadedAt: Date | null;
  hash: string | null;
  inputsFingerprint: string;
};

/** Announced cover row: paint fields + caption enrichment from one WCA pass. */
export type CoverCompetitionRow = {
  name: string;
  city: string;
  stateName: string | null;
  startDate: string;
  endDate: string;
  logoUrl: string | null;
  registrationOpen: string | null;
  registrationClose: string | null;
  venueName: string | null;
  venueAddress: string | null;
  venueDetails: string | null;
  eventIds: string[];
  competitorLimit: number | null;
  capacityFallback: number | null;
};

export type { CoverStatus };
export { classifyCoverStatus, coverInputsFingerprint };

/** Best-effort in-process L1 cache; hydrated from DB on first refresh. */
let lastUploadedCoverHash: string | null = null;
let coverHashCacheHydrated = false;

function todayMexicoIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function toCoverSlotInput(row: CoverCompetitionRow): CoverSlotInput {
  return {
    city: row.city,
    stateName: row.stateName,
    startDate: row.startDate,
    endDate: row.endDate,
    logoUrl: row.logoUrl,
    registrationOpen: row.registrationOpen,
    registrationClose: row.registrationClose,
  };
}

function toCaptionItem(
  row: CoverCompetitionRow,
): ProximasCompetenciasCaptionItem {
  return {
    name: row.name,
    city: row.city,
    stateName: row.stateName,
    startDate: row.startDate,
    endDate: row.endDate,
    venueName: row.venueName,
    venueAddress: row.venueAddress,
    venueDetails: row.venueDetails,
    eventIds: row.eventIds,
    competitorLimit: row.competitorLimit,
    capacityFallback: row.capacityFallback,
  };
}

async function loadStoredCoverState() {
  return db.query.facebookCoverState.findFirst({
    where: eq(facebookCoverState.id, FACEBOOK_COVER_STATE_ID),
  });
}

async function hydrateCoverHashCache(): Promise<string | null> {
  if (coverHashCacheHydrated) {
    return lastUploadedCoverHash;
  }
  try {
    const stored = await loadStoredCoverState();
    lastUploadedCoverHash = stored?.pngHash ?? null;
  } catch (error) {
    console.error("Failed to hydrate Facebook cover hash cache:", error);
    lastUploadedCoverHash = null;
  }
  coverHashCacheHydrated = true;
  return lastUploadedCoverHash;
}

async function persistCoverState(options: {
  pngHash: string;
  inputsFingerprint: string;
  slotCount: number;
  photoId: string | null;
}): Promise<void> {
  const uploadedAt = new Date();
  await db
    .insert(facebookCoverState)
    .values({
      id: FACEBOOK_COVER_STATE_ID,
      pngHash: options.pngHash,
      inputsFingerprint: options.inputsFingerprint,
      slotCount: options.slotCount,
      photoId: options.photoId,
      uploadedAt,
    })
    .onConflictDoUpdate({
      target: facebookCoverState.id,
      set: {
        pngHash: options.pngHash,
        inputsFingerprint: options.inputsFingerprint,
        slotCount: options.slotCount,
        photoId: options.photoId,
        uploadedAt,
      },
    });

  lastUploadedCoverHash = options.pngHash;
  coverHashCacheHydrated = true;
}

/** Announced upcoming comps for the cover (≤9), with WCA enrichment for paint + caption. */
export async function listCoverCompetitions(): Promise<CoverCompetitionRow[]> {
  const today = todayMexicoIsoDate();
  const rows = await db.query.competitions.findMany({
    where: and(
      eq(competitions.statusPublic, "announced"),
      gte(competitions.endDate, today),
    ),
    orderBy: [asc(competitions.startDate), asc(competitions.id)],
    columns: {
      name: true,
      city: true,
      startDate: true,
      endDate: true,
      capacity: true,
      wcaCompetitionUrl: true,
    },
    with: {
      state: { columns: { name: true } },
    },
    limit: COVER_MAX_SLOTS,
  });

  return Promise.all(
    rows.map(async (row) => {
      let logoUrl: string | null = null;
      let registrationOpen: string | null = null;
      let registrationClose: string | null = null;
      let venueName: string | null = null;
      let venueAddress: string | null = null;
      let venueDetails: string | null = null;
      let eventIds: string[] = [];
      let competitorLimit: number | null = null;
      let displayName = row.name?.trim() || "Competencia";

      const wcaUrl = row.wcaCompetitionUrl?.trim();
      if (wcaUrl) {
        const wca = await fetchWcaCompetition(wcaUrl);
        if (wca.ok) {
          logoUrl = wca.competition.logoUrl;
          registrationOpen = wca.competition.registrationOpen;
          registrationClose = wca.competition.registrationClose;
          venueName = wca.competition.venueName;
          venueAddress = wca.competition.venueAddress;
          venueDetails = wca.competition.venueDetails;
          eventIds = wca.competition.eventIds;
          competitorLimit = wca.competition.competitorLimit;
          displayName =
            wca.competition.shortName?.trim() ||
            wca.competition.name?.trim() ||
            displayName;
        }
      }

      return {
        name: displayName,
        city: row.city,
        stateName: row.state?.name ?? null,
        startDate: row.startDate,
        endDate: row.endDate,
        logoUrl,
        registrationOpen,
        registrationClose,
        venueName,
        venueAddress,
        venueDetails,
        eventIds,
        competitorLimit,
        capacityFallback: row.capacity > 0 ? row.capacity : null,
      };
    }),
  );
}

export async function listCoverCompetitionInputs(): Promise<CoverSlotInput[]> {
  const rows = await listCoverCompetitions();
  return rows.map(toCoverSlotInput);
}

/** Generate the current cover PNG without uploading to Meta. */
export async function generateTorneoDeRubikCoverPng(): Promise<
  | {
      ok: true;
      png: Buffer;
      hash: string;
      slotCount: number;
      inputs: CoverSlotInput[];
      competitions: CoverCompetitionRow[];
      inputsFingerprint: string;
      caption: string;
    }
  | { ok: false; message: string }
> {
  try {
    const competitions = await listCoverCompetitions();
    const inputs = competitions.map(toCoverSlotInput);
    const generated = await generateCoverPngFromInputs(inputs);
    return {
      ok: true,
      png: generated.png,
      hash: generated.hash,
      slotCount: generated.slotCount,
      inputs,
      competitions,
      inputsFingerprint: coverInputsFingerprint(inputs),
      caption: buildProximasCompetenciasCaption(
        competitions.map(toCaptionItem),
      ),
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
 * Uploads once as a published photo with PRÓXIMAS caption, then sets that photo as cover.
 * Skips Meta when the PNG hash is unchanged.
 */
export async function refreshTorneoDeRubikCover(options?: {
  force?: boolean;
}): Promise<RefreshCoverResult> {
  const generated = await generateTorneoDeRubikCoverPng();
  if (!generated.ok) {
    return generated;
  }

  const storedHash = await hydrateCoverHashCache();
  if (!options?.force && storedHash && storedHash === generated.hash) {
    return {
      ok: true,
      message: "Portada sin cambios; no se re-subió a Facebook.",
      slotCount: generated.slotCount,
      hash: generated.hash,
      skippedUnchanged: true,
    };
  }

  const uploaded = await updateFacebookPageCover(
    generated.png,
    generated.caption,
  );
  if (!uploaded.ok) {
    return uploaded;
  }

  try {
    await persistCoverState({
      pngHash: generated.hash,
      inputsFingerprint: generated.inputsFingerprint,
      slotCount: generated.slotCount,
      photoId: uploaded.photoId,
    });
  } catch (error) {
    console.error("Failed to persist Facebook cover state:", error);
    lastUploadedCoverHash = generated.hash;
    coverHashCacheHydrated = true;
  }

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

/**
 * Compare current announced cover inputs to the last successful upload.
 * Uses the inputs fingerprint (cheap); does not regenerate the PNG.
 */
export async function getTorneoDeRubikCoverStatus(): Promise<TorneoDeRubikCoverStatus> {
  const inputs = await listCoverCompetitionInputs();
  const inputsFingerprint = coverInputsFingerprint(inputs);
  const slotCount = inputs.length;

  let stored: Awaited<ReturnType<typeof loadStoredCoverState>>;
  try {
    stored = await loadStoredCoverState();
  } catch (error) {
    console.error("Failed to load Facebook cover state:", error);
    stored = undefined;
  }

  return {
    status: classifyCoverStatus(stored?.inputsFingerprint, inputsFingerprint),
    slotCount,
    uploadedAt: stored?.uploadedAt ?? null,
    hash: stored?.pngHash ?? null,
    inputsFingerprint,
  };
}

/** Test helper: reset in-memory hash cache. */
export function resetCoverHashCacheForTests(): void {
  lastUploadedCoverHash = null;
  coverHashCacheHydrated = false;
}
