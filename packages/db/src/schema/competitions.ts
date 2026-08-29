import { InferSelectModel } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { boards } from "./boards";
import { states } from "./geo";

export const publicStatusEnum = pgEnum("public_status", [
  "open", // Fecha abierta
  "reserved", // Fecha reservada
  "confirmed", // Sede confirmada
  "announced", // Competencia anunciada
  "suspended", // Competencia suspendida
  "unavailable", // Fecha inhábil
]);

export const internalStatusEnum = pgEnum("internal_status", [
  "asked_for_help", // Se ha solicitado ayuda
  "looking_for_venue",
  "venue_found", // Sede encontrada
  "wca_approved", // Aprobada por la WCA
  "registration_open", // Registro abierto
  "celebrated", // Competencia finalizada
  "cancelled", // Competencia cancelada
]);

export const logActionEnum = pgEnum("log_action", [
  "create_competition",
  "update_competition",
  "delete_competition",
  "send_ultimatum",
  "submit_availability",
]);

export const logTargetTypeEnum = pgEnum("log_target_type", [
  "competition",
  "availability",
]);

export const competitions = pgTable("competition", {
  id: serial("id").primaryKey(),
  name: text("name"),
  city: text("city").notNull(),

  stateId: text("state_id")
    .notNull()
    .references(() => states.id),

  requestedBy: text("requested_by").references(() => user.wcaId),

  trelloUrl: text("trello_url"),
  wcaCompetitionUrl: text("wca_competition_url"),

  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),

  capacity: integer("capacity").notNull().default(0),

  statusPublic: publicStatusEnum("status_public").default("reserved").notNull(),
  statusInternal: internalStatusEnum("status_internal")
    .default("looking_for_venue")
    .notNull(),

  notes: text("notes"),

  trelloAssignedAt: timestamp("trello_assigned_at"),
  ultimatumSetTo: timestamp("ultimatum_set_to"),

  boardId: integer("board_id").references((): AnyPgColumn => boards.id, {
    onDelete: "set null",
  }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Competition = InferSelectModel<typeof competitions>;

export const competitionDelegates = pgTable("competition_delegate", {
  competitionId: serial("competition_id")
    .notNull()
    .references(() => competitions.id, { onDelete: "cascade" }),
  delegateWcaId: text("delegate_wca_id")
    .notNull()
    .references(() => user.wcaId, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").default(false).notNull(),
});

export type CompetitionDelegate = InferSelectModel<typeof competitionDelegates>;

export const competitionOrganizers = pgTable("competition_organizer", {
  competitionId: serial("competition_id")
    .notNull()
    .references(() => competitions.id, { onDelete: "cascade" }),
  organizerWcaId: text("organizer_wca_id")
    .notNull()
    .references(() => user.wcaId, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").default(false).notNull(),
});

export const availability = pgTable(
  "availability",
  {
    id: serial("id").primaryKey(),
    userWcaId: text("user_wca_id")
      .notNull()
      .references(() => user.wcaId, { onDelete: "cascade" }),
    date: date("date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("availability_user_date_idx").on(table.userWcaId, table.date),
    unique().on(table.userWcaId, table.date),
  ],
);

export type Availability = InferSelectModel<typeof availability>;

export const holidays = pgTable("holiday", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  official: boolean("official").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Holiday = InferSelectModel<typeof holidays>;

export const logs = pgTable(
  "log",
  {
    id: serial("id").primaryKey(),
    action: logActionEnum("action").notNull(),
    targetType: logTargetTypeEnum("target_type").notNull(),
    targetId: text("target_id").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id),
    details: jsonb("details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("log_target_idx").on(table.targetType, table.targetId),
    index("log_actor_idx").on(table.actorId),
  ],
);

export type Logs = InferSelectModel<typeof logs>;
