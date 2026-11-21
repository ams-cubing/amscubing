import { eq } from "drizzle-orm";

import {
  displayCityFromWcaCity,
  resolveMexicoStateFromWcaCity,
} from "./data/mexico";
import { db } from "./index";
import { competitions, logs } from "./schema";

export type WcaCompetitionSyncSource = {
  name: string | null;
  shortName: string | null;
  city: string | null;
  startDate: string | null;
  endDate: string | null;
  competitorLimit: number | null;
  mainEventId: string | null;
};

export type CompetitionWcaSyncField =
  | "name"
  | "startDate"
  | "endDate"
  | "capacity"
  | "mainEventId"
  | "city"
  | "stateId";

export type ApplyCompetitionWcaSyncResult =
  | {
      ok: true;
      updatedFields: CompetitionWcaSyncField[];
      message: string;
    }
  | {
      ok: false;
      updatedFields: [];
      message: string;
    };

type CompetitionSyncRow = {
  name: string | null;
  city: string;
  stateId: string;
  startDate: string;
  endDate: string;
  capacity: number;
  mainEventId: string | null;
  wcaCompetitionUrl: string | null;
  statusPublic: string;
};

export function buildCompetitionPatchFromWca(
  row: CompetitionSyncRow,
  wca: WcaCompetitionSyncSource,
): Partial<
  Pick<
    typeof competitions.$inferInsert,
    | "name"
    | "startDate"
    | "endDate"
    | "capacity"
    | "mainEventId"
    | "city"
    | "stateId"
  >
> {
  const patch: Partial<
    Pick<
      typeof competitions.$inferInsert,
      | "name"
      | "startDate"
      | "endDate"
      | "capacity"
      | "mainEventId"
      | "city"
      | "stateId"
    >
  > = {};

  const wcaName = (wca.name?.trim() || wca.shortName?.trim() || null) || null;
  if (wcaName && wcaName !== (row.name ?? null)) {
    patch.name = wcaName;
  }

  if (wca.startDate && wca.startDate !== row.startDate) {
    patch.startDate = wca.startDate;
  }

  if (wca.endDate && wca.endDate !== row.endDate) {
    patch.endDate = wca.endDate;
  }

  if (
    typeof wca.competitorLimit === "number" &&
    wca.competitorLimit > 0 &&
    wca.competitorLimit !== row.capacity
  ) {
    patch.capacity = wca.competitorLimit;
  }

  if (wca.mainEventId && wca.mainEventId !== (row.mainEventId ?? null)) {
    patch.mainEventId = wca.mainEventId;
  }

  if (wca.city?.trim()) {
    const stateId = resolveMexicoStateFromWcaCity(wca.city);
    const city = displayCityFromWcaCity(wca.city);
    if (stateId && city) {
      if (city !== row.city) patch.city = city;
      if (stateId !== row.stateId) patch.stateId = stateId;
    }
  }

  return patch;
}

/**
 * Apply WCA fields onto a local competition row.
 * Callers fetch WCA details (via `@workspace/social`) and pass them here.
 */
export async function applyCompetitionWcaSync(input: {
  competitionId: number;
  actorId: string;
  wca: WcaCompetitionSyncSource;
  /**
   * When true (default), refuse unless `statusPublic === "announced"`.
   * Announce flows may pass false so sync can run right after the transition
   * write, or on the same request before re-reading status.
   */
  requireAnnounced?: boolean;
}): Promise<ApplyCompetitionWcaSyncResult> {
  const requireAnnounced = input.requireAnnounced ?? true;

  const competition = await db.query.competitions.findFirst({
    where: eq(competitions.id, input.competitionId),
    columns: {
      name: true,
      city: true,
      stateId: true,
      startDate: true,
      endDate: true,
      capacity: true,
      mainEventId: true,
      wcaCompetitionUrl: true,
      statusPublic: true,
    },
  });

  if (!competition) {
    return {
      ok: false,
      updatedFields: [],
      message: "Competencia no encontrada",
    };
  }

  if (requireAnnounced && competition.statusPublic !== "announced") {
    return {
      ok: false,
      updatedFields: [],
      message: "Solo se sincronizan competencias anunciadas",
    };
  }

  if (!competition.wcaCompetitionUrl?.trim()) {
    return {
      ok: false,
      updatedFields: [],
      message: "La competencia no tiene URL de la WCA",
    };
  }

  const patch = buildCompetitionPatchFromWca(competition, input.wca);
  const updatedFields = Object.keys(patch) as CompetitionWcaSyncField[];

  if (updatedFields.length === 0) {
    return {
      ok: true,
      updatedFields: [],
      message: "Los datos locales ya coinciden con la WCA",
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(competitions)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(eq(competitions.id, input.competitionId));

    await tx.insert(logs).values({
      action: "update_competition",
      targetType: "competition",
      targetId: String(input.competitionId),
      actorId: input.actorId,
      details: {
        source: "wca_sync",
        updatedFields,
        patch,
      },
    });
  });

  return {
    ok: true,
    updatedFields,
    message:
      updatedFields.length === 1
        ? "Se actualizó 1 campo desde la WCA"
        : `Se actualizaron ${updatedFields.length} campos desde la WCA`,
  };
}
