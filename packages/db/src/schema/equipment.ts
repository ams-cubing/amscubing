import { type InferSelectModel } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { competitions } from "./competitions";

export const equipmentCategoryEnum = pgEnum("equipment_category", [
  "timer",
  "display",
  "accessory",
  "other",
]);

/** `serialized`: each unit has its own SKU. `bulk`: counted per guardian. */
export const equipmentTrackingEnum = pgEnum("equipment_tracking", [
  "serialized",
  "bulk",
]);

export const equipmentStatusEnum = pgEnum("equipment_status", [
  "functional", // Funcional
  "faulty", // Defectuoso
  "in_repair", // En reparación
  "lost", // Extraviado
  "retired", // Baja (vendido, desechado)
]);

export const equipmentAcquisitionKindEnum = pgEnum(
  "equipment_acquisition_kind",
  ["purchase", "donation", "sponsorship", "sale", "disposal"],
);

export const equipmentEventActionEnum = pgEnum("equipment_event_action", [
  "item_created",
  "item_updated",
  "status_changed",
  "transferred",
  "stock_adjusted",
  "loaned",
  "returned",
  "acquisition_recorded",
  "retired",
  "request_updated",
  "request_submitted",
  "request_cancelled",
  "request_confirmed",
]);

export const equipmentRequestStatusEnum = pgEnum("equipment_request_status", [
  "draft",
  "submitted",
  "fulfilled",
  "cancelled",
]);

export const equipmentTypes = pgTable("equipment_type", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  skuPrefix: text("sku_prefix").notNull().unique(),
  category: equipmentCategoryEnum("category").notNull(),
  tracking: equipmentTrackingEnum("tracking").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  /** Still in inventory (and lendable) but no longer requested or confirmed for competitions. */
  obsoleteAt: timestamp("obsolete_at"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EquipmentType = InferSelectModel<typeof equipmentTypes>;

export const equipmentAcquisitions = pgTable(
  "equipment_acquisition",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    description: text("description").notNull(),
    source: text("source").notNull(),
    kind: equipmentAcquisitionKindEnum("kind").notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("equipment_acquisition_date_idx").on(table.date)],
);

export type EquipmentAcquisition = InferSelectModel<
  typeof equipmentAcquisitions
>;

export const equipmentAcquisitionLines = pgTable(
  "equipment_acquisition_line",
  {
    id: serial("id").primaryKey(),
    acquisitionId: integer("acquisition_id")
      .notNull()
      .references(() => equipmentAcquisitions.id, { onDelete: "cascade" }),
    typeId: integer("type_id")
      .notNull()
      .references(() => equipmentTypes.id),
    quantityDelta: integer("quantity_delta").notNull(),
  },
  (table) => [
    index("equipment_acquisition_line_acquisition_idx").on(table.acquisitionId),
  ],
);

export const equipmentItems = pgTable(
  "equipment_item",
  {
    id: serial("id").primaryKey(),
    sku: text("sku").notNull().unique(),
    typeId: integer("type_id")
      .notNull()
      .references(() => equipmentTypes.id),
    guardianUserId: text("guardian_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    status: equipmentStatusEnum("status").notNull().default("functional"),
    acquisitionId: integer("acquisition_id").references(
      () => equipmentAcquisitions.id,
      { onDelete: "set null" },
    ),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("equipment_item_guardian_idx").on(table.guardianUserId),
    index("equipment_item_type_idx").on(table.typeId),
  ],
);

export type EquipmentItem = InferSelectModel<typeof equipmentItems>;

/** `quantity` includes units currently on loan; on-loan amounts come from open loan lines. */
export const equipmentStock = pgTable(
  "equipment_stock",
  {
    id: serial("id").primaryKey(),
    typeId: integer("type_id")
      .notNull()
      .references(() => equipmentTypes.id),
    guardianUserId: text("guardian_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    notes: text("notes"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("equipment_stock_type_guardian_unique").on(
      table.typeId,
      table.guardianUserId,
    ),
    index("equipment_stock_guardian_idx").on(table.guardianUserId),
  ],
);

export type EquipmentStock = InferSelectModel<typeof equipmentStock>;

/**
 * What the organizers of a competition ask for. `fulfilled` means a delegate
 * confirmed the equipment they will bring (see `equipment_confirmation_line`).
 */
export const equipmentRequests = pgTable("equipment_request", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id")
    .notNull()
    .unique()
    .references(() => competitions.id, { onDelete: "cascade" }),
  status: equipmentRequestStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  requestedByUserId: text("requested_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  confirmedByUserId: text("confirmed_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  submittedAt: timestamp("submitted_at"),
  fulfilledAt: timestamp("fulfilled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type EquipmentRequest = InferSelectModel<typeof equipmentRequests>;

export const equipmentRequestLines = pgTable(
  "equipment_request_line",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id")
      .notNull()
      .references(() => equipmentRequests.id, { onDelete: "cascade" }),
    typeId: integer("type_id")
      .notNull()
      .references(() => equipmentTypes.id),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    unique("equipment_request_line_request_type_unique").on(
      table.requestId,
      table.typeId,
    ),
  ],
);

/**
 * Equipment a delegate confirmed for a competition. Units stay with their
 * guardian; while the request is `fulfilled` and the competition hasn't ended
 * they can't be lent, moved, removed or confirmed elsewhere.
 * Either `itemId` (serialized unit) or `typeId` + `quantity` (bulk).
 */
export const equipmentConfirmationLines = pgTable(
  "equipment_confirmation_line",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id")
      .notNull()
      .references(() => equipmentRequests.id, { onDelete: "cascade" }),
    typeId: integer("type_id")
      .notNull()
      .references(() => equipmentTypes.id),
    itemId: integer("item_id").references(() => equipmentItems.id),
    guardianUserId: text("guardian_user_id")
      .notNull()
      .references(() => user.id),
    quantity: integer("quantity").notNull().default(1),
  },
  (table) => [
    unique("equipment_confirmation_line_request_item_unique").on(
      table.requestId,
      table.itemId,
    ),
    index("equipment_confirmation_line_item_idx").on(table.itemId),
    index("equipment_confirmation_line_guardian_type_idx").on(
      table.guardianUserId,
      table.typeId,
    ),
  ],
);

export type EquipmentConfirmationLine = InferSelectModel<
  typeof equipmentConfirmationLines
>;

export const equipmentLoans = pgTable(
  "equipment_loan",
  {
    id: serial("id").primaryKey(),
    borrowerUserId: text("borrower_user_id")
      .notNull()
      .references(() => user.id),
    lentByUserId: text("lent_by_user_id")
      .notNull()
      .references(() => user.id),
    competitionId: integer("competition_id").references(() => competitions.id, {
      onDelete: "set null",
    }),
    reason: text("reason").notNull(),
    loanedAt: date("loaned_at").notNull(),
    dueAt: date("due_at"),
    returnedAt: timestamp("returned_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("equipment_loan_borrower_idx").on(table.borrowerUserId),
    index("equipment_loan_lent_by_idx").on(table.lentByUserId),
    index("equipment_loan_competition_idx").on(table.competitionId),
  ],
);

export type EquipmentLoan = InferSelectModel<typeof equipmentLoans>;

/** Either `itemId` (serialized unit) or `typeId` + `quantity` (bulk). */
export const equipmentLoanLines = pgTable(
  "equipment_loan_line",
  {
    id: serial("id").primaryKey(),
    loanId: integer("loan_id")
      .notNull()
      .references(() => equipmentLoans.id, { onDelete: "cascade" }),
    typeId: integer("type_id")
      .notNull()
      .references(() => equipmentTypes.id),
    itemId: integer("item_id").references(() => equipmentItems.id),
    quantity: integer("quantity").notNull().default(1),
    returnedQuantity: integer("returned_quantity").notNull().default(0),
    returnedAt: timestamp("returned_at"),
    returnStatus: equipmentStatusEnum("return_status"),
  },
  (table) => [
    index("equipment_loan_line_loan_idx").on(table.loanId),
    index("equipment_loan_line_item_idx").on(table.itemId),
  ],
);

export type EquipmentLoanLine = InferSelectModel<typeof equipmentLoanLines>;

export const equipmentEvents = pgTable(
  "equipment_event",
  {
    id: serial("id").primaryKey(),
    action: equipmentEventActionEnum("action").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id),
    itemId: integer("item_id").references(() => equipmentItems.id, {
      onDelete: "set null",
    }),
    typeId: integer("type_id").references(() => equipmentTypes.id),
    guardianUserId: text("guardian_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    quantityDelta: integer("quantity_delta"),
    loanId: integer("loan_id").references(() => equipmentLoans.id, {
      onDelete: "set null",
    }),
    acquisitionId: integer("acquisition_id").references(
      () => equipmentAcquisitions.id,
      { onDelete: "set null" },
    ),
    fromUserId: text("from_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    toUserId: text("to_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    details: jsonb("details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("equipment_event_item_idx").on(table.itemId, table.createdAt),
    index("equipment_event_loan_idx").on(table.loanId),
    index("equipment_event_created_idx").on(table.createdAt),
  ],
);

export type EquipmentEvent = InferSelectModel<typeof equipmentEvents>;

export const equipmentSkuCounters = pgTable(
  "equipment_sku_counter",
  {
    prefix: text("prefix").notNull(),
    year: integer("year").notNull(),
    next: integer("next").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.prefix, table.year] })],
);
