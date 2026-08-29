import { InferSelectModel, sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const notificationTypeEnum = pgEnum("notification_type", [
  "card_assigned",
  "card_comment",
  "card_mention",
  "card_ready_for_review",
  "board_member_joined",
  "delegate_added",
  "delegate_removed",
  "organizer_added",
  "organizer_removed",
  "competition_status_changed",
  "competition_readiness",
  "date_requested",
  "ultimatum_sent",
]);

export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

export type NotificationPayload = {
  boardId?: number;
  boardName?: string;
  cardId?: number;
  cardTitle?: string;
  competitionId?: number;
  city?: string;
  statusPublic?: string;
  statusInternal?: string;
  statusLabel?: string;
  actorName?: string;
  suggestionKind?: string;
};

export const notifications = pgTable(
  "notification",
  {
    id: serial("id").primaryKey(),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    href: text("href").notNull(),
    payload: jsonb("payload").$type<NotificationPayload>(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notification_recipient_created_idx").on(
      table.recipientId,
      table.createdAt,
    ),
    index("notification_recipient_unread_idx")
      .on(table.recipientId)
      .where(sql`${table.readAt} is null`),
  ],
);

export type Notification = InferSelectModel<typeof notifications>;
