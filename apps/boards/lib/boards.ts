import { and, eq, inArray } from "drizzle-orm";

import { db } from "@workspace/db";
import {
  boards,
  competitionDelegates,
  competitionOrganizers,
  competitions,
  type User,
} from "@workspace/db/schema";

export async function canAccessBoard(user: User, boardId: number) {
  if (user.role === "delegate") {
    return true;
  }

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { id: true, isTemplate: true, competitionId: true },
  });

  if (!board || board.isTemplate || !board.competitionId) {
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

export async function listAccessibleBoards(user: User) {
  if (user.role === "delegate") {
    return db.query.boards.findMany({
      where: eq(boards.isTemplate, false),
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
        },
      },
      orderBy: (board, { desc }) => [desc(board.createdAt)],
    });
  }

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

  const competitionIds = [
    ...new Set([
      ...delegateRows.map((r) => r.competitionId),
      ...organizerRows.map((r) => r.competitionId),
    ]),
  ];

  if (competitionIds.length === 0) {
    return [];
  }

  return db.query.boards.findMany({
    where: and(
      eq(boards.isTemplate, false),
      inArray(boards.competitionId, competitionIds),
    ),
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
      },
    },
    orderBy: (board, { desc }) => [desc(board.createdAt)],
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

  return (
    competition.name ||
    `${competition.city} — ${competition.startDate}`
  );
}
