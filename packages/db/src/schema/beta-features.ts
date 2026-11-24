import { InferSelectModel } from "drizzle-orm";
import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

/** Per-user beta feature grants (managed at /admin/beta). */
export const betaFeatureGrants = pgTable(
  "beta_feature_grant",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    featureKey: text("feature_key").notNull(),
    grantedByUserId: text("granted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.featureKey] })],
);

export type BetaFeatureGrant = InferSelectModel<typeof betaFeatureGrants>;
