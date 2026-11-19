import { cacheLife, cacheTag } from "next/cache";

import { db } from "@workspace/db";
import { getCompetitionScaleTiers } from "@workspace/db/ams-competition-scale-store";
import type { AmsCompetitionTier } from "@workspace/db/ams-competition-scale";

export async function getPublicCompetitionScaleTiers(): Promise<
  AmsCompetitionTier[]
> {
  "use cache";
  cacheLife("hours");
  cacheTag("ams-competition-scale");
  const config = await getCompetitionScaleTiers(db);
  return config.tiers;
}
