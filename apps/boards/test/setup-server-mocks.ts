import { vi } from "vitest";

export const unauthorizedError = new Error("UNAUTHORIZED");

const boardMocks = vi.hoisted(() => {
  const unauthorizedFn = vi.fn(() => {
    throw unauthorizedError;
  });

  return {
    getSession: vi.fn(),
    unauthorized: unauthorizedFn,
    revalidatePath: vi.fn(),
    canAccessBoard: vi.fn(),
    isBoardArchived: vi.fn(),
    maybeNotifyReadinessSuggestion: vi.fn(),
    notifyHechoReview: vi.fn(),
    sendBoardNotificationEmail: vi.fn(),
    findFirstCard: vi.fn(),
    findFirstBoardList: vi.fn(),
    findFirstBoard: vi.fn(),
    findFirstLabel: vi.fn(),
    dbUpdate: vi.fn(),
    dbInsert: vi.fn(),
    dbDelete: vi.fn(),
    isCompetitionOrganizer: vi.fn(),
  };
});

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({
  unauthorized: boardMocks.unauthorized,
}));

vi.mock("next/cache", () => ({
  revalidatePath: boardMocks.revalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: boardMocks.getSession,
    },
  },
}));

vi.mock("@/lib/boards", () => ({
  canAccessBoard: boardMocks.canAccessBoard,
  isBoardArchived: boardMocks.isBoardArchived,
}));

vi.mock("@/lib/board-notifications", () => ({
  maybeNotifyReadinessSuggestion: boardMocks.maybeNotifyReadinessSuggestion,
  notifyHechoReview: boardMocks.notifyHechoReview,
}));

vi.mock("@/lib/board-emails", () => ({
  sendBoardNotificationEmail: boardMocks.sendBoardNotificationEmail,
}));

vi.mock("@workspace/db/notifications", () => ({
  boardTeamByRole: vi.fn(),
  boardTeamUsers: vi.fn(),
  formatNotificationTitle: vi.fn(),
  hrefForNotification: vi.fn(),
  insertNotifications: vi.fn(),
  isCompetitionOrganizer: boardMocks.isCompetitionOrganizer,
  competitionNotificationRow: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: {
    query: {
      cards: {
        findFirst: boardMocks.findFirstCard,
      },
      boardLists: {
        findFirst: boardMocks.findFirstBoardList,
      },
      boards: {
        findFirst: boardMocks.findFirstBoard,
      },
      labels: {
        findFirst: boardMocks.findFirstLabel,
      },
      user: {
        findFirst: vi.fn(),
      },
      boardMembers: {
        findFirst: vi.fn(),
      },
      competitionDelegates: {
        findFirst: vi.fn(),
      },
      competitionOrganizers: {
        findFirst: vi.fn(),
      },
    },
    update: (...args: unknown[]) => boardMocks.dbUpdate(...args),
    insert: (...args: unknown[]) => boardMocks.dbInsert(...args),
    delete: (...args: unknown[]) => boardMocks.dbDelete(...args),
  },
}));

export function mockAuthenticatedUser(
  overrides: Partial<{
    id: string;
    role: string;
    wcaId: string;
    name: string;
  }> = {},
) {
  boardMocks.getSession.mockResolvedValue({
    user: {
      id: "user-1",
      role: "user",
      wcaId: "2020TEST01",
      name: "Test User",
      ...overrides,
    },
  });
}

export function mockBoardAccessAllowed() {
  boardMocks.canAccessBoard.mockResolvedValue(true);
  boardMocks.isBoardArchived.mockResolvedValue(false);
}

export function resetBoardMocks() {
  boardMocks.getSession.mockReset();
  boardMocks.unauthorized.mockReset();
  boardMocks.unauthorized.mockImplementation(() => {
    throw unauthorizedError;
  });
  boardMocks.revalidatePath.mockReset();
  boardMocks.canAccessBoard.mockReset();
  boardMocks.isBoardArchived.mockReset();
  boardMocks.maybeNotifyReadinessSuggestion.mockReset();
  boardMocks.notifyHechoReview.mockReset();
  boardMocks.sendBoardNotificationEmail.mockReset();
  boardMocks.findFirstCard.mockReset();
  boardMocks.findFirstBoardList.mockReset();
  boardMocks.findFirstBoard.mockReset();
  boardMocks.findFirstLabel.mockReset();
  boardMocks.dbUpdate.mockReset();
  boardMocks.dbInsert.mockReset();
  boardMocks.dbDelete.mockReset();
  boardMocks.isCompetitionOrganizer.mockReset();
}

export function getBoardMocks() {
  return boardMocks;
}
