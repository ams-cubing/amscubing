import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { db } from "@workspace/db";
import {
  boardMembers,
  boards,
  competitionDelegates,
  competitionOrganizers,
  competitions,
  type User,
} from "@workspace/db/schema";

const boardListWith = {
  competition: {
    columns: {
      id: true,
      name: true,
      city: true,
      startDate: true,
      endDate: true,
      statusPublic: true,
      statusInternal: true,
    },
  },
} as const;

export async function canAccessBoard(user: User, boardId: number) {
  if (user.role === "delegate") {
    return true;
  }

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { id: true, isTemplate: true, competitionId: true },
  });

  if (!board || board.isTemplate) {
    return false;
  }

  const membership = await db.query.boardMembers.findFirst({
    where: and(
      eq(boardMembers.boardId, boardId),
      eq(boardMembers.userId, user.id),
    ),
  });
  if (membership) {
    return true;
  }

  if (!board.competitionId) {
    return false;
  }

  const [asDelegate, asOrganizer] = await Promise.all([
    db.query.competitionDelegates.findFirst({
      where: and(
        eq(competitionDelegates.competitionId, board.competitionId),
        eq(competitionDelegates.delegateWcaId, user.wcaId),
      ),
    }),
    db.query.competitionOrganizers.findFirst({
      where: and(
        eq(competitionOrganizers.competitionId, board.competitionId),
        eq(competitionOrganizers.organizerWcaId, user.wcaId),
      ),
    }),
  ]);

  return Boolean(asDelegate || asOrganizer);
}

export async function isBoardArchived(boardId: number) {
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { archivedAt: true },
  });
  return Boolean(board?.archivedAt);
}

async function competitionIdsForUser(user: User) {
  const [delegateRows, organizerRows] = await Promise.all([
    db.query.competitionDelegates.findMany({
      where: eq(competitionDelegates.delegateWcaId, user.wcaId),
      columns: { competitionId: true },
    }),
    db.query.competitionOrganizers.findMany({
      where: eq(competitionOrganizers.organizerWcaId, user.wcaId),
      columns: { competitionId: true },
    }),
  ]);

  return [
    ...new Set([
      ...delegateRows.map((r) => r.competitionId),
      ...organizerRows.map((r) => r.competitionId),
    ]),
  ];
}

async function memberBoardIdsForUser(user: User) {
  const rows = await db.query.boardMembers.findMany({
    where: eq(boardMembers.userId, user.id),
    columns: { boardId: true },
  });
  return rows.map((r) => r.boardId);
}

export async function listAccessibleBoards(user: User) {
  if (user.role === "delegate") {
    return db.query.boards.findMany({
      where: and(eq(boards.isTemplate, false), isNull(boards.archivedAt)),
      with: boardListWith,
      orderBy: (board, { desc }) => [desc(board.createdAt)],
    });
  }

  const [competitionIds, memberBoardIds] = await Promise.all([
    competitionIdsForUser(user),
    memberBoardIdsForUser(user),
  ]);

  const fromCompetition =
    competitionIds.length > 0
      ? await db.query.boards.findMany({
          where: and(
            eq(boards.isTemplate, false),
            isNull(boards.archivedAt),
            inArray(boards.competitionId, competitionIds),
          ),
          with: boardListWith,
          orderBy: (board, { desc }) => [desc(board.createdAt)],
        })
      : [];

  const fromMembership =
    memberBoardIds.length > 0
      ? await db.query.boards.findMany({
          where: and(
            eq(boards.isTemplate, false),
            isNull(boards.archivedAt),
            inArray(boards.id, memberBoardIds),
          ),
          with: boardListWith,
          orderBy: (board, { desc }) => [desc(board.createdAt)],
        })
      : [];

  const byId = new Map<number, (typeof fromCompetition)[number]>();
  for (const board of [...fromCompetition, ...fromMembership]) {
    byId.set(board.id, board);
  }

  return [...byId.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export async function listArchivedBoards(user: User) {
  if (user.role === "delegate") {
    return db.query.boards.findMany({
      where: and(eq(boards.isTemplate, false), isNotNull(boards.archivedAt)),
      with: boardListWith,
      orderBy: (board, { desc }) => [desc(board.archivedAt)],
    });
  }

  const [competitionIds, memberBoardIds] = await Promise.all([
    competitionIdsForUser(user),
    memberBoardIdsForUser(user),
  ]);

  const fromCompetition =
    competitionIds.length > 0
      ? await db.query.boards.findMany({
          where: and(
            eq(boards.isTemplate, false),
            isNotNull(boards.archivedAt),
            inArray(boards.competitionId, competitionIds),
          ),
          with: boardListWith,
          orderBy: (board, { desc }) => [desc(board.archivedAt)],
        })
      : [];

  const fromMembership =
    memberBoardIds.length > 0
      ? await db.query.boards.findMany({
          where: and(
            eq(boards.isTemplate, false),
            isNotNull(boards.archivedAt),
            inArray(boards.id, memberBoardIds),
          ),
          with: boardListWith,
          orderBy: (board, { desc }) => [desc(board.archivedAt)],
        })
      : [];

  const byId = new Map<number, (typeof fromCompetition)[number]>();
  for (const board of [...fromCompetition, ...fromMembership]) {
    byId.set(board.id, board);
  }

  return [...byId.values()].sort((a, b) => {
    const aTime = a.archivedAt?.getTime() ?? 0;
    const bTime = b.archivedAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

export async function listTemplates(user: User) {
  if (user.role !== "delegate") {
    return [];
  }

  return db.query.boards.findMany({
    where: eq(boards.isTemplate, true),
    orderBy: (board, { asc }) => [asc(board.name)],
  });
}

export async function getBoardForUser(user: User, boardId: number) {
  const allowed = await canAccessBoard(user, boardId);
  if (!allowed) {
    return null;
  }

  return db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    with: {
      competition: {
        columns: {
          id: true,
          name: true,
          city: true,
          startDate: true,
          endDate: true,
          statusPublic: true,
          statusInternal: true,
        },
        with: {
          delegates: {
            with: {
              delegate: true,
            },
          },
          organizers: {
            with: {
              organizer: true,
            },
          },
        },
      },
      members: {
        with: {
          user: true,
        },
      },
      labels: true,
      lists: {
        orderBy: (list, { asc }) => [asc(list.position)],
        with: {
          cards: {
            orderBy: (card, { asc }) => [asc(card.position)],
            with: {
              cardLabels: {
                with: {
                  label: true,
                },
              },
              checklists: {
                with: {
                  items: true,
                },
              },
              attachments: true,
              members: {
                with: {
                  user: true,
                },
              },
              comments: {
                orderBy: (comment, { asc }) => [asc(comment.createdAt)],
                with: {
                  author: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getCompetitionName(competitionId: number) {
  const competition = await db.query.competitions.findFirst({
    where: eq(competitions.id, competitionId),
    columns: { name: true, city: true, startDate: true },
  });

  if (!competition) return `Competencia #${competitionId}`;

  return competition.name || `${competition.city} — ${competition.startDate}`;
}
