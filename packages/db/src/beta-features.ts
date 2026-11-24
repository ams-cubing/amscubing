import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { db as Db } from "./index";
import { permissionAudit, user } from "./schema";
import { betaFeatureGrants } from "./schema/beta-features";
import {
  BOARDS_TOOLS_BETA_KEY,
  BOARDS_TOOLS_DENIED_MESSAGE,
  isBetaFeatureKey,
  type BetaFeatureKey,
} from "./beta-feature-labels";

export {
  BETA_FEATURES,
  BOARDS_TOOLS_BETA_KEY,
  BOARDS_TOOLS_DENIED_MESSAGE,
  betaFeatureLabel,
  isBetaFeatureKey,
  type BetaFeatureKey,
} from "./beta-feature-labels";

type DbOrTx = Pick<
  typeof Db,
  "select" | "insert" | "update" | "delete" | "query" | "transaction"
>;

export async function userHasBetaFeature(
  database: DbOrTx,
  userId: string,
  featureKey: BetaFeatureKey,
) {
  const [row] = await database
    .select({ userId: betaFeatureGrants.userId })
    .from(betaFeatureGrants)
    .where(
      and(
        eq(betaFeatureGrants.userId, userId),
        eq(betaFeatureGrants.featureKey, featureKey),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function userHasBoardsToolsBeta(database: DbOrTx, userId: string) {
  return userHasBetaFeature(database, userId, BOARDS_TOOLS_BETA_KEY);
}

/** Throws when the user cannot use the in-app boards tools pack. */
export async function requireBoardsToolsBeta(
  database: DbOrTx,
  userId: string,
) {
  if (!(await userHasBoardsToolsBeta(database, userId))) {
    throw new Error(BOARDS_TOOLS_DENIED_MESSAGE);
  }
}

export type BetaGrantRow = {
  userId: string;
  featureKey: BetaFeatureKey;
  name: string;
  email: string;
  image: string | null;
  wcaId: string | null;
  grantedByUserId: string | null;
  grantedByName: string | null;
  createdAt: Date;
};

export async function listBetaGrants(
  database: DbOrTx,
  featureKey?: BetaFeatureKey,
): Promise<BetaGrantRow[]> {
  const grantedBy = alias(user, "beta_granted_by");

  const rows = await database
    .select({
      userId: betaFeatureGrants.userId,
      featureKey: betaFeatureGrants.featureKey,
      name: user.name,
      email: user.email,
      image: user.image,
      wcaId: user.wcaId,
      grantedByUserId: betaFeatureGrants.grantedByUserId,
      grantedByName: grantedBy.name,
      createdAt: betaFeatureGrants.createdAt,
    })
    .from(betaFeatureGrants)
    .innerJoin(user, eq(user.id, betaFeatureGrants.userId))
    .leftJoin(
      grantedBy,
      eq(grantedBy.id, betaFeatureGrants.grantedByUserId),
    )
    .where(
      featureKey ? eq(betaFeatureGrants.featureKey, featureKey) : undefined,
    )
    .orderBy(asc(betaFeatureGrants.featureKey), asc(user.name));

  return rows
    .filter((row) => isBetaFeatureKey(row.featureKey))
    .map((row) => ({
      ...row,
      featureKey: row.featureKey as BetaFeatureKey,
    }));
}

export async function setBetaFeatureGrant(
  database: DbOrTx,
  input: {
    actorId: string;
    targetUserId: string;
    featureKey: BetaFeatureKey;
    enabled: boolean;
  },
): Promise<{ changed: boolean; previousEnabled: boolean }> {
  return database.transaction(async (tx) => {
    const [before] = await tx
      .select({ userId: betaFeatureGrants.userId })
      .from(betaFeatureGrants)
      .where(
        and(
          eq(betaFeatureGrants.userId, input.targetUserId),
          eq(betaFeatureGrants.featureKey, input.featureKey),
        ),
      )
      .limit(1);
    const previousEnabled = Boolean(before);

    if (input.enabled === previousEnabled) {
      return { changed: false, previousEnabled };
    }

    if (input.enabled) {
      await tx.insert(betaFeatureGrants).values({
        userId: input.targetUserId,
        featureKey: input.featureKey,
        grantedByUserId: input.actorId,
      });
    } else {
      await tx
        .delete(betaFeatureGrants)
        .where(
          and(
            eq(betaFeatureGrants.userId, input.targetUserId),
            eq(betaFeatureGrants.featureKey, input.featureKey),
          ),
        );
    }

    await tx.insert(permissionAudit).values({
      actorId: input.actorId,
      targetId: input.targetUserId,
      scope: `beta:${input.featureKey}`,
      previousRole: previousEnabled ? "on" : null,
      nextRole: input.enabled ? "on" : null,
    });

    return { changed: true, previousEnabled };
  });
}
