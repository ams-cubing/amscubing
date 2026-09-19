import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getBoardMocks,
  mockAuthenticatedUser,
  mockBoardAccessAllowed,
  resetBoardMocks,
  unauthorizedError,
} from "@/test/setup-server-mocks";

import { saveCompetitionSocialFields } from "@/app/boards/[boardId]/_actions/social-publish-actions";

const boardId = 10;
const cardId = 7;

function cardOnBoard(id: number, board = boardId) {
  return {
    id,
    title: "Publicación redes Torneo de Rubik",
    listId: 1,
    list: {
      title: "Por Hacer",
      boardId: board,
    },
  };
}

beforeEach(() => {
  resetBoardMocks();
});

describe("saveCompetitionSocialFields", () => {
  it("rejects unauthenticated callers", async () => {
    const { getSession, unauthorized, dbUpdate } = getBoardMocks();
    getSession.mockResolvedValue(null);

    await expect(
      saveCompetitionSocialFields({
        boardId,
        cardId,
        customText: "Hola",
        tags: "",
        flyerUrl: null,
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
      saveCompetitionSocialFields({
        boardId,
        cardId,
        customText: "Hola",
        tags: "",
        flyerUrl: null,
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

    const result = await saveCompetitionSocialFields({
      boardId,
      cardId,
      customText: "Copy del post",
      tags: "@team",
      flyerUrl: null,
    });

    expect(result).toEqual({
      ok: false,
      message: "Este tablero no está ligado a una competencia",
    });
    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it("saves null when custom text is empty", async () => {
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

    const result = await saveCompetitionSocialFields({
      boardId,
      cardId,
      customText: "   ",
      tags: "",
      flyerUrl: null,
    });

    expect(result).toEqual({
      ok: true,
      message: "Datos de publicación guardados",
    });
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({
        socialCustomText: null,
        socialTags: null,
        socialFlyerUrl: null,
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/boards/${boardId}`);
  });

  it("saves social fields and revalidates", async () => {
    const {
      findFirstCard,
      findFirstBoard,
      findFirstAttachment,
      dbUpdate,
      dbInsert,
      revalidatePath,
    } = getBoardMocks();
    mockAuthenticatedUser();
    mockBoardAccessAllowed();
    findFirstCard.mockResolvedValue(cardOnBoard(cardId));
    findFirstBoard.mockResolvedValue({ competitionId: 42 });
    findFirstAttachment.mockResolvedValue(null);

    const setFn = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    dbUpdate.mockReturnValue({ set: setFn });
    dbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const result = await saveCompetitionSocialFields({
      boardId,
      cardId,
      customText: "  Mega Mente llega  ",
      tags: "  @rubik_teampuebla  ",
      flyerUrl: "https://utfs.io/f/flyer.png",
    });

    expect(result).toEqual({
      ok: true,
      message: "Datos de publicación guardados",
    });
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({
        socialCustomText: "Mega Mente llega",
        socialTags: "@rubik_teampuebla",
        socialFlyerUrl: "https://utfs.io/f/flyer.png",
      }),
    );
    expect(dbInsert).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith(`/boards/${boardId}`);
  });
});
