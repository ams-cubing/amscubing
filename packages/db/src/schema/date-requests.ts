import { InferSelectModel } from "drizzle-orm";
import {
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { competitions } from "./competitions";
import { states } from "./geo";

export const dateRequestStatusEnum = pgEnum("date_request_status", [
  "open",
  "accepted",
  "exhausted",
]);

export const dateRequests = pgTable("date_request", {
  id: serial("id").primaryKey(),
  city: text("city").notNull(),
  stateId: text("state_id")
    .notNull()
    .references(() => states.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  requestedBy: text("requested_by")
    .notNull()
    .references(() => user.wcaId),
  proposedDelegateWcaId: text("proposed_delegate_wca_id").references(
    () => user.wcaId,
  ),
  declinedDelegateWcaIds: jsonb("declined_delegate_wca_ids")
    .$type<string[]>()
    .default([])
    .notNull(),
  status: dateRequestStatusEnum("status").default("open").notNull(),
  competitionId: integer("competition_id").references(() => competitions.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DateRequest = InferSelectModel<typeof dateRequests>;
