import { eq } from "drizzle-orm";

import {
  AmsCompetitionScaleError,
  DEFAULT_AMS_COMPETITION_TIERS,
  deserializeScaleTiers,
  normalizeScaleTiers,
  serializeScaleTiers,
  type AmsCompetitionTier,
} from "./ams-competition-scale";
import type { db } from "./index";
import { amsCompetitionScaleConfig } from "./schema/ams-scale";

type DbOrTx = Pick<typeof db, "select" | "insert" | "update" | "query">;

export const AMS_COMPETITION_SCALE_CONFIG_ID = 1;

export type CompetitionScaleConfig = {
  tiers: AmsCompetitionTier[];
  updatedAt: Date | null;
  updatedByUserId: string | null;
  updatedByName: string | null;
};

export async function getCompetitionScaleTiers(
  client: DbOrTx,
): Promise<CompetitionScaleConfig> {
  const row = await client.query.amsCompetitionScaleConfig.findFirst({
    where: eq(amsCompetitionScaleConfig.id, AMS_COMPETITION_SCALE_CONFIG_ID),
    columns: {
      tiers: true,
      updatedAt: true,
      updatedByUserId: true,
    },
    with: {
      updatedBy: {
        columns: { name: true },
      },
    },
  });

  if (!row || !Array.isArray(row.tiers) || row.tiers.length === 0) {
    return {
      tiers: [...DEFAULT_AMS_COMPETITION_TIERS],
      updatedAt: null,
      updatedByUserId: null,
      updatedByName: null,
    };
  }

  const meta = {
    updatedAt: row.updatedAt,
    updatedByUserId: row.updatedByUserId,
    updatedByName: row.updatedBy?.name ?? null,
  };

  try {
    return {
      tiers: normalizeScaleTiers(deserializeScaleTiers(row.tiers)),
      ...meta,
    };
  } catch {
    return {
      tiers: [...DEFAULT_AMS_COMPETITION_TIERS],
      ...meta,
    };
  }
}

export async function saveCompetitionScaleTiers(
  client: DbOrTx,
  input: unknown,
  actorUserId: string | null,
): Promise<CompetitionScaleConfig> {
  const tiers = normalizeScaleTiers(input);
  const stored = serializeScaleTiers(tiers);
  const now = new Date();

  const updated = await client
    .update(amsCompetitionScaleConfig)
    .set({
      tiers: stored,
      updatedAt: now,
      updatedByUserId: actorUserId,
    })
    .where(eq(amsCompetitionScaleConfig.id, AMS_COMPETITION_SCALE_CONFIG_ID))
    .returning({ id: amsCompetitionScaleConfig.id });

  if (updated.length === 0) {
    await client.insert(amsCompetitionScaleConfig).values({
      id: AMS_COMPETITION_SCALE_CONFIG_ID,
      tiers: stored,
      updatedAt: now,
      updatedByUserId: actorUserId,
    });
  }

  return {
    tiers,
    updatedAt: now,
    updatedByUserId: actorUserId,
    updatedByName: null,
  };
}

export function assertCanSaveScaleTiers(input: unknown): AmsCompetitionTier[] {
  try {
    return normalizeScaleTiers(input);
  } catch (error) {
    if (error instanceof AmsCompetitionScaleError) throw error;
    throw new AmsCompetitionScaleError("Tabulador inválido");
  }
}
