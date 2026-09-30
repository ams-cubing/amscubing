import { and, eq, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@workspace/db";
import { competitions } from "@workspace/db/schema";

/** A claim older than this is treated as abandoned (crashed or timed-out request). */
export const SOCIAL_PUBLISH_CLAIM_TTL_MINUTES = 10;

export const SOCIAL_PUBLISH_CLAIM_REJECT_MESSAGE =
  "Esta competencia ya se está publicando o ya fue publicada";

/**
 * Atomically reserve the right to publish a competition to Meta.
 * Returns false when another request holds a fresh claim or a post already exists.
 */
export async function claimCompetitionSocialPublish(
  competitionId: number,
): Promise<boolean> {
  const rows = await db
    .update(competitions)
    .set({ socialPublishClaimedAt: sql`now()` })
    .where(
      and(
        eq(competitions.id, competitionId),
        isNull(competitions.facebookPostId),
        eq(competitions.socialPublishedManually, false),
        or(
          isNull(competitions.socialPublishClaimedAt),
          lt(
            competitions.socialPublishClaimedAt,
            sql`now() - make_interval(mins => ${SOCIAL_PUBLISH_CLAIM_TTL_MINUTES})`,
          ),
        ),
      ),
    )
    .returning({ id: competitions.id });

  return rows.length > 0;
}

export async function releaseCompetitionSocialPublish(
  competitionId: number,
): Promise<void> {
  await db
    .update(competitions)
    .set({ socialPublishClaimedAt: null })
    .where(eq(competitions.id, competitionId));
}
