import { InferSelectModel } from "drizzle-orm";
import {
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/** Stored tier row: open-ended bounds use `null` instead of Infinity. */
export type AmsCompetitionTierStored = {
  level: string;
  labelEs: string;
  maxCompetitors: number | null;
  maxStations: number | null;
  maxEvents: number;
  minDelegates: number;
  delegatesOpenEnded: boolean;
  minOrganizerCompetitions: number;
};

/** Singleton AMS tabulador config (always id = 1). */
export const amsCompetitionScaleConfig = pgTable(
  "ams_competition_scale_config",
  {
    id: serial("id").primaryKey(),
    tiers: jsonb("tiers").$type<AmsCompetitionTierStored[]>().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
  },
);

export type AmsCompetitionScaleConfig = InferSelectModel<
  typeof amsCompetitionScaleConfig
>;
