import { pgTable, text, timestamp, serial } from "drizzle-orm/pg-core";
import { user } from "./auth";

/** Private account details; never exposed in public delegate or author pages. */
export const userProfile = pgTable("user_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  city: text("city").notNull().default(""),
  biography: text("biography").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const permissionAudit = pgTable("permission_audit", {
  id: serial("id").primaryKey(),
  actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
  targetId: text("target_id").references(() => user.id, {
    onDelete: "set null",
  }),
  scope: text("scope").notNull(),
  previousRole: text("previous_role"),
  nextRole: text("next_role"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
