import { relations } from "drizzle-orm";

import { account, session, user } from "./auth";
import {
  boardInvites,
  boardLists,
  boardMembers,
  boards,
  cardAttachments,
  cardComments,
  cardLabels,
  cardMembers,
  cards,
  checklistItems,
  checklists,
  labels,
} from "./boards";
import {
  availability,
  competitionDelegates,
  competitionOrganizers,
  competitions,
  logs,
} from "./competitions";
import { regions, states } from "./geo";
import { notifications } from "./notifications";

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
  receivedNotifications: many(notifications, {
    relationName: "notificationRecipient",
  }),
  actedNotifications: many(notifications, {
    relationName: "notificationActor",
  }),
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

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(user, {
    fields: [notifications.recipientId],
    references: [user.id],
    relationName: "notificationRecipient",
  }),
  actor: one(user, {
    fields: [notifications.actorId],
    references: [user.id],
    relationName: "notificationActor",
  }),
}));

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
