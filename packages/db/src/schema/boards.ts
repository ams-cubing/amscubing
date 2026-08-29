import { InferSelectModel } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { competitions } from "./competitions";

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
