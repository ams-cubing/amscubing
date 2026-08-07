import { InferSelectModel, relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  integer,
  unique,
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  pgEnum,
  serial,
  date,
  jsonb,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  wcaId: text("wca_id").notNull().unique(),
  role: text("role", { enum: ["delegate", "user"] })
    .default("user")
    .notNull(),
  regionId: text("region_id").references(() => regions.id),
  /** Public-facing WCA title, e.g. "Delegado Junior". */
  delegateTitle: text("delegate_title"),
  /** Public-facing location label, e.g. "Mérida — Sureste". */
  delegateLocation: text("delegate_location"),
  lastLogin: timestamp("last_login").defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  region: one(regions, {
    fields: [user.regionId],
    references: [regions.id],
  }),
  delegatedCompetitions: many(competitionDelegates),
  organizedCompetitions: many(competitionOrganizers),
  availability: many(availability),
  activityLogs: many(logs),
  cardMemberships: many(cardMembers),
  cardComments: many(cardComments),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

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

export const states = pgTable("state", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  regionId: text("region_id")
    .notNull()
    .references(() => regions.id),
});

export type State = InferSelectModel<typeof states>;

export const regions = pgTable("region", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  mapColor: text("map_color").notNull(),
});

export type Region = InferSelectModel<typeof regions>;

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

export const boards = pgTable("board", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isTemplate: boolean("is_template").default(false).notNull(),
  competitionId: integer("competition_id")
    .unique()
    .references((): AnyPgColumn => competitions.id, { onDelete: "cascade" }),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type Board = InferSelectModel<typeof boards>;

export const boardMembers = pgTable(
  "board_member",
  {
    boardId: integer("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique().on(table.boardId, table.userId),
    index("board_member_board_idx").on(table.boardId),
    index("board_member_user_idx").on(table.userId),
  ],
);

export type BoardMember = InferSelectModel<typeof boardMembers>;

export const boardInvites = pgTable(
  "board_invite",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [
    index("board_invite_board_idx").on(table.boardId),
    index("board_invite_token_idx").on(table.token),
  ],
);

export type BoardInvite = InferSelectModel<typeof boardInvites>;

export const boardLists = pgTable(
  "board_list",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
  },
  (table) => [index("board_list_board_idx").on(table.boardId)],
);

export type BoardList = InferSelectModel<typeof boardLists>;

export const cards = pgTable(
  "card",
  {
    id: serial("id").primaryKey(),
    listId: integer("list_id")
      .notNull()
      .references(() => boardLists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    coverUrl: text("cover_url"),
    dueDate: timestamp("due_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("card_list_idx").on(table.listId)],
);

export type Card = InferSelectModel<typeof cards>;

export const labels = pgTable(
  "label",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
  },
  (table) => [index("label_board_idx").on(table.boardId)],
);

export type Label = InferSelectModel<typeof labels>;

export const cardLabels = pgTable(
  "card_label",
  {
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    labelId: integer("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique().on(table.cardId, table.labelId),
    index("card_label_card_idx").on(table.cardId),
  ],
);

export type CardLabel = InferSelectModel<typeof cardLabels>;

export const checklists = pgTable(
  "checklist",
  {
    id: serial("id").primaryKey(),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
  },
  (table) => [index("checklist_card_idx").on(table.cardId)],
);

export type Checklist = InferSelectModel<typeof checklists>;

export const checklistItems = pgTable(
  "checklist_item",
  {
    id: serial("id").primaryKey(),
    checklistId: integer("checklist_id")
      .notNull()
      .references(() => checklists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    done: boolean("done").default(false).notNull(),
    position: integer("position").notNull().default(0),
  },
  (table) => [index("checklist_item_checklist_idx").on(table.checklistId)],
);

export type ChecklistItem = InferSelectModel<typeof checklistItems>;

export const cardAttachments = pgTable(
  "card_attachment",
  {
    id: serial("id").primaryKey(),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("card_attachment_card_idx").on(table.cardId)],
);

export type CardAttachment = InferSelectModel<typeof cardAttachments>;

export const cardMembers = pgTable(
  "card_member",
  {
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique().on(table.cardId, table.userId),
    index("card_member_card_idx").on(table.cardId),
    index("card_member_user_idx").on(table.userId),
  ],
);

export type CardMember = InferSelectModel<typeof cardMembers>;

export const cardComments = pgTable(
  "card_comment",
  {
    id: serial("id").primaryKey(),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("card_comment_card_idx").on(table.cardId),
    index("card_comment_author_idx").on(table.authorId),
  ],
);

export type CardComment = InferSelectModel<typeof cardComments>;

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

export const statesRelations = relations(states, ({ one, many }) => ({
  region: one(regions, {
    fields: [states.regionId],
    references: [regions.id],
  }),
  competitions: many(competitions),
}));

export const regionsRelations = relations(regions, ({ many }) => ({
  states: many(states),
  users: many(user),
}));

export const competitionsRelations = relations(
  competitions,
  ({ one, many }) => ({
    state: one(states, {
      fields: [competitions.stateId],
      references: [states.id],
    }),
    delegates: many(competitionDelegates),
    organizers: many(competitionOrganizers),
    board: one(boards, {
      fields: [competitions.boardId],
      references: [boards.id],
    }),
  }),
);

export const boardsRelations = relations(boards, ({ one, many }) => ({
  competition: one(competitions, {
    fields: [boards.competitionId],
    references: [competitions.id],
  }),
  lists: many(boardLists),
  labels: many(labels),
  members: many(boardMembers),
  invites: many(boardInvites),
}));

export const boardMembersRelations = relations(boardMembers, ({ one }) => ({
  board: one(boards, {
    fields: [boardMembers.boardId],
    references: [boards.id],
  }),
  user: one(user, {
    fields: [boardMembers.userId],
    references: [user.id],
  }),
}));

export const boardInvitesRelations = relations(boardInvites, ({ one }) => ({
  board: one(boards, {
    fields: [boardInvites.boardId],
    references: [boards.id],
  }),
  createdBy: one(user, {
    fields: [boardInvites.createdByUserId],
    references: [user.id],
  }),
}));

export const boardListsRelations = relations(boardLists, ({ one, many }) => ({
  board: one(boards, {
    fields: [boardLists.boardId],
    references: [boards.id],
  }),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  list: one(boardLists, {
    fields: [cards.listId],
    references: [boardLists.id],
  }),
  cardLabels: many(cardLabels),
  checklists: many(checklists),
  attachments: many(cardAttachments),
  members: many(cardMembers),
  comments: many(cardComments),
}));

export const labelsRelations = relations(labels, ({ one, many }) => ({
  board: one(boards, {
    fields: [labels.boardId],
    references: [boards.id],
  }),
  cardLabels: many(cardLabels),
}));

export const cardLabelsRelations = relations(cardLabels, ({ one }) => ({
  card: one(cards, {
    fields: [cardLabels.cardId],
    references: [cards.id],
  }),
  label: one(labels, {
    fields: [cardLabels.labelId],
    references: [labels.id],
  }),
}));

export const checklistsRelations = relations(checklists, ({ one, many }) => ({
  card: one(cards, {
    fields: [checklists.cardId],
    references: [cards.id],
  }),
  items: many(checklistItems),
}));

export const checklistItemsRelations = relations(checklistItems, ({ one }) => ({
  checklist: one(checklists, {
    fields: [checklistItems.checklistId],
    references: [checklists.id],
  }),
}));

export const cardAttachmentsRelations = relations(
  cardAttachments,
  ({ one }) => ({
    card: one(cards, {
      fields: [cardAttachments.cardId],
      references: [cards.id],
    }),
  }),
);

export const cardMembersRelations = relations(cardMembers, ({ one }) => ({
  card: one(cards, {
    fields: [cardMembers.cardId],
    references: [cards.id],
  }),
  user: one(user, {
    fields: [cardMembers.userId],
    references: [user.id],
  }),
}));

export const cardCommentsRelations = relations(cardComments, ({ one }) => ({
  card: one(cards, {
    fields: [cardComments.cardId],
    references: [cards.id],
  }),
  author: one(user, {
    fields: [cardComments.authorId],
    references: [user.id],
  }),
}));

export const competitionDelegatesRelations = relations(
  competitionDelegates,
  ({ one }) => ({
    competition: one(competitions, {
      fields: [competitionDelegates.competitionId],
      references: [competitions.id],
    }),
    delegate: one(user, {
      fields: [competitionDelegates.delegateWcaId],
      references: [user.wcaId],
    }),
  }),
);

export const competitionOrganizersRelations = relations(
  competitionOrganizers,
  ({ one }) => ({
    competition: one(competitions, {
      fields: [competitionOrganizers.competitionId],
      references: [competitions.id],
    }),
    organizer: one(user, {
      fields: [competitionOrganizers.organizerWcaId],
      references: [user.wcaId],
    }),
  }),
);

export const logsRelations = relations(logs, ({ one }) => ({
  actor: one(user, {
    fields: [logs.actorId],
    references: [user.id],
  }),
}));

export const availabilityRelations = relations(availability, ({ one }) => ({
  user: one(user, {
    fields: [availability.userWcaId],
    references: [user.wcaId],
  }),
}));
