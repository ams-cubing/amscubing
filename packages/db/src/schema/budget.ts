import { type InferSelectModel } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { competitions } from "./competitions";

export const budgetStatusEnum = pgEnum("competition_budget_status", [
  "draft",
  "plan_submitted",
  "plan_approved",
  "mid_submitted",
  "mid_approved",
  "final_submitted",
  "closed",
]);

export const budgetLineKindEnum = pgEnum("competition_budget_line_kind", [
  "expense",
  "income",
]);

export const budgetLineCategoryEnum = pgEnum(
  "competition_budget_line_category",
  [
    "sede",
    "viaticos_transporte",
    "viaticos_hospedaje",
    "viaticos_alimentos",
    "materiales",
    "comida_staff",
    "premios",
    "papeleria",
    "cuota_wca",
    "cuota_ams",
    "inscripciones",
    "patrocinio_efectivo",
    "otros",
  ],
);

export const budgetSpendStatusEnum = pgEnum(
  "competition_budget_spend_status",
  ["none", "proposed", "approved", "rejected"],
);

export const budgetReceiptStatusEnum = pgEnum(
  "competition_budget_receipt_status",
  ["pending", "in_drive", "missing_reason"],
);

export const sponsorTypeEnum = pgEnum("competition_sponsor_type", [
  "cash",
  "in_kind",
]);

export const competitionBudgets = pgTable("competition_budget", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id")
    .notNull()
    .unique()
    .references(() => competitions.id, { onDelete: "cascade" }),
  status: budgetStatusEnum("status").notNull().default("draft"),
  proposedRegistrationFeeCents: integer("proposed_registration_fee_cents")
    .notNull()
    .default(0),
  expectedCompetitorCount: integer("expected_competitor_count")
    .notNull()
    .default(0),
  registrationRevenueCents: integer("registration_revenue_cents"),
  receiptsDriveUrl: text("receipts_drive_url"),
  spreadsheetUrl: text("spreadsheet_url"),
  remanenteNote: text("remanente_note"),
  remanenteDecision: text("remanente_decision"),
  /** Set when a delegate returns a stage; cleared on the next organizer submit. */
  reviewNote: text("review_note"),
  planSubmittedByUserId: text("plan_submitted_by_user_id").references(
    () => user.id,
    { onDelete: "set null" },
  ),
  planSubmittedAt: timestamp("plan_submitted_at"),
  planApprovedByUserId: text("plan_approved_by_user_id").references(
    () => user.id,
    { onDelete: "set null" },
  ),
  planApprovedAt: timestamp("plan_approved_at"),
  midSubmittedByUserId: text("mid_submitted_by_user_id").references(
    () => user.id,
    { onDelete: "set null" },
  ),
  midSubmittedAt: timestamp("mid_submitted_at"),
  midApprovedByUserId: text("mid_approved_by_user_id").references(
    () => user.id,
    { onDelete: "set null" },
  ),
  midApprovedAt: timestamp("mid_approved_at"),
  finalSubmittedByUserId: text("final_submitted_by_user_id").references(
    () => user.id,
    { onDelete: "set null" },
  ),
  finalSubmittedAt: timestamp("final_submitted_at"),
  closedByUserId: text("closed_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CompetitionBudget = InferSelectModel<typeof competitionBudgets>;

export const competitionSponsors = pgTable(
  "competition_sponsor",
  {
    id: serial("id").primaryKey(),
    competitionId: integer("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: sponsorTypeEnum("type").notNull(),
    amountCents: integer("amount_cents"),
    conditions: text("conditions"),
    logoUrl: text("logo_url"),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("competition_sponsor_competition_idx").on(table.competitionId),
    unique("competition_sponsor_competition_name_unique").on(
      table.competitionId,
      table.name,
    ),
  ],
);

export type CompetitionSponsor = InferSelectModel<typeof competitionSponsors>;

export const competitionBudgetLines = pgTable(
  "competition_budget_line",
  {
    id: serial("id").primaryKey(),
    budgetId: integer("budget_id")
      .notNull()
      .references(() => competitionBudgets.id, { onDelete: "cascade" }),
    kind: budgetLineKindEnum("kind").notNull(),
    category: budgetLineCategoryEnum("category").notNull(),
    label: text("label").notNull(),
    expectedCents: integer("expected_cents").notNull().default(0),
    actualCents: integer("actual_cents"),
    spendStatus: budgetSpendStatusEnum("spend_status")
      .notNull()
      .default("none"),
    receiptStatus: budgetReceiptStatusEnum("receipt_status")
      .notNull()
      .default("pending"),
    receiptMissingReason: text("receipt_missing_reason"),
    isSystem: boolean("is_system").notNull().default(false),
    /** When set, this income line is owned by a cash sponsor and synced from it. */
    sponsorId: integer("sponsor_id").references(() => competitionSponsors.id, {
      onDelete: "cascade",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    notes: text("notes"),
    spendApprovedByUserId: text("spend_approved_by_user_id").references(
      () => user.id,
      { onDelete: "set null" },
    ),
    spendApprovedAt: timestamp("spend_approved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("competition_budget_line_budget_idx").on(table.budgetId),
    unique("competition_budget_line_sponsor_unique").on(table.sponsorId),
  ],
);

export type CompetitionBudgetLine = InferSelectModel<
  typeof competitionBudgetLines
>;
