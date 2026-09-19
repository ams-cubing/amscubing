import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getBoardMocks,
  mockAuthenticatedUser,
  mockBoardAccessAllowed,
  resetBoardMocks,
  unauthorizedError,
} from "@/test/setup-server-mocks";

import { saveCompetitionWcaUrl } from "@/app/boards/[boardId]/_actions/wca-url-actions";

const boardId = 10;
const cardId = 7;
const wcaUrl =
  "https://www.worldcubeassociation.org/competitions/MegaMenteOpen2026";

const fetchWcaCompetition = vi.fn();
const normalizeWcaCompetitionUrl = vi.fn((url: string) => url.trim());

vi.mock("@workspace/social", () => ({
  fetchWcaCompetition: (...args: unknown[]) => fetchWcaCompetition(...args),
  normalizeWcaCompetitionUrl: (...args: unknown[]) =>
    normalizeWcaCompetitionUrl(...(args as [string])),
}));

function cardOnBoard(id: number, board = boardId) {
  return {
    id,
    title: "Sitio web (WCA)",
    listId: 1,
    list: {
      title: "Por Hacer",
      boardId: board,
    },
  };
}

beforeEach(() => {
  resetBoardMocks();
  fetchWcaCompetition.mockReset();
  normalizeWcaCompetitionUrl.mockReset();
  normalizeWcaCompetitionUrl.mockImplementation((url: string) => url.trim());
});

describe("saveCompetitionWcaUrl", () => {
  it("rejects unauthenticated callers", async () => {
    const { getSession, unauthorized, dbUpdate } = getBoardMocks();
    getSession.mockResolvedValue(null);

    await expect(
      saveCompetitionWcaUrl({
        boardId,
        cardId,
        wcaCompetitionUrl: wcaUrl,
      }),
    ).rejects.toThrow(unauthorizedError);

    expect(unauthorized).toHaveBeenCalled();
    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it("rejects users without board access", async () => {
    const { canAccessBoard, dbUpdate } = getBoardMocks();
    mockAuthenticatedUser();
    canAccessBoard.mockResolvedValue(false);

    await expect(
      saveCompetitionWcaUrl({
        boardId,
        cardId,
        wcaCompetitionUrl: wcaUrl,
      }),
    ).rejects.toThrow("No tienes acceso a este tablero");

    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it("returns error when board has no competition", async () => {
    const { findFirstCard, findFirstBoard, dbUpdate } = getBoardMocks();
    mockAuthenticatedUser();
    mockBoardAccessAllowed();
    findFirstCard.mockResolvedValue(cardOnBoard(cardId));
    findFirstBoard.mockResolvedValue({ competitionId: null });

    const result = await saveCompetitionWcaUrl({
      boardId,
      cardId,
      wcaCompetitionUrl: wcaUrl,
    });

    expect(result).toEqual({
      ok: false,
      message: "Este tablero no está ligado a una competencia",
    });
    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it("rejects invalid WCA URLs", async () => {
    const { findFirstCard, findFirstBoard, dbUpdate } = getBoardMocks();
    mockAuthenticatedUser();
    mockBoardAccessAllowed();
    findFirstCard.mockResolvedValue(cardOnBoard(cardId));
    findFirstBoard.mockResolvedValue({ competitionId: 42 });
    normalizeWcaCompetitionUrl.mockReturnValue("https://example.com/bad");
    fetchWcaCompetition.mockResolvedValue({
      ok: false,
      message:
        "La URL de la WCA no es válida. Usa un enlace como https://www.worldcubeassociation.org/competitions/...",
    });

    const result = await saveCompetitionWcaUrl({
      boardId,
      cardId,
      wcaCompetitionUrl: "https://example.com/bad",
    });

    expect(result).toEqual({
      ok: false,
      message:
        "La URL de la WCA no es válida. Usa un enlace como https://www.worldcubeassociation.org/competitions/...",
    });
    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it("clears the URL when empty", async () => {
    const { findFirstCard, findFirstBoard, dbUpdate, revalidatePath } =
      getBoardMocks();
    mockAuthenticatedUser();
    mockBoardAccessAllowed();
    findFirstCard.mockResolvedValue(cardOnBoard(cardId));
    findFirstBoard.mockResolvedValue({ competitionId: 42 });

    const setFn = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    dbUpdate.mockReturnValue({ set: setFn });

    const result = await saveCompetitionWcaUrl({
      boardId,
      cardId,
      wcaCompetitionUrl: "   ",
    });

    expect(result).toEqual({
      ok: true,
      message: "URL de la WCA eliminada",
      wcaCompetitionUrl: null,
    });
    expect(fetchWcaCompetition).not.toHaveBeenCalled();
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({
        wcaCompetitionUrl: null,
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/boards/${boardId}`);
  });

  it("saves normalized WCA URL and revalidates", async () => {
    const { findFirstCard, findFirstBoard, dbUpdate, revalidatePath } =
      getBoardMocks();
    mockAuthenticatedUser();
    mockBoardAccessAllowed();
    findFirstCard.mockResolvedValue(cardOnBoard(cardId));
    findFirstBoard.mockResolvedValue({ competitionId: 42 });
    normalizeWcaCompetitionUrl.mockReturnValue(wcaUrl);
    fetchWcaCompetition.mockResolvedValue({
      ok: true,
      competition: {
        id: "MegaMenteOpen2026",
        name: "Mega Mente Open 2026",
        shortName: null,
        information: null,
        url: wcaUrl,
        logoUrl: null,
        city: null,
        venueName: null,
        venueAddress: null,
        venueDetails: null,
        eventIds: [],
        competitorLimit: null,
        registrationOpen: null,
        registrationClose: null,
      },
    });

    const setFn = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    dbUpdate.mockReturnValue({ set: setFn });

    const result = await saveCompetitionWcaUrl({
      boardId,
      cardId,
      wcaCompetitionUrl: `  ${wcaUrl}  `,
    });

    expect(result).toEqual({
      ok: true,
      message: "URL de la WCA guardada",
      wcaCompetitionUrl: wcaUrl,
    });
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({
        wcaCompetitionUrl: wcaUrl,
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/boards/${boardId}`);
  });
});
