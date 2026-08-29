import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getBoardMocks,
  mockAuthenticatedUser,
  mockBoardAccessAllowed,
  resetBoardMocks,
  unauthorizedError,
} from "@/test/setup-server-mocks";

import {
  createLabelAction,
  deleteLabelAction,
  moveCardAction,
  updateCardAction,
} from "@/app/boards/[boardId]/_actions/board-actions";

const boardId = 10;

beforeEach(() => {
  resetBoardMocks();
});

describe("board-actions authz", () => {
  it("rejects unauthenticated callers via unauthorized()", async () => {
    const { getSession, unauthorized, dbInsert } = getBoardMocks();
    getSession.mockResolvedValue(null);

    await expect(
      createLabelAction({
        boardId,
        name: "Urgente",
        color: "#ff0000",
      }),
    ).rejects.toThrow(unauthorizedError);

    expect(unauthorized).toHaveBeenCalled();
    expect(dbInsert).not.toHaveBeenCalled();
  });

  it("rejects users without board access", async () => {
    const { canAccessBoard, isBoardArchived, dbInsert } = getBoardMocks();
    mockAuthenticatedUser();
    canAccessBoard.mockResolvedValue(false);
    isBoardArchived.mockResolvedValue(false);

    await expect(
      createLabelAction({
        boardId,
        name: "Urgente",
        color: "#ff0000",
      }),
    ).rejects.toThrow("No tienes acceso a este tablero");

    expect(dbInsert).not.toHaveBeenCalled();
  });

  it("rejects edits on archived boards", async () => {
    const { canAccessBoard, isBoardArchived, dbInsert } = getBoardMocks();
    mockAuthenticatedUser();
    canAccessBoard.mockResolvedValue(true);
    isBoardArchived.mockResolvedValue(true);

    await expect(
      createLabelAction({
        boardId,
        name: "Urgente",
        color: "#ff0000",
      }),
    ).rejects.toThrow("Este tablero está archivado y no se puede editar");

    expect(dbInsert).not.toHaveBeenCalled();
  });
});

describe("createLabelAction", () => {
  beforeEach(() => {
    mockAuthenticatedUser();
    mockBoardAccessAllowed();
  });

  it("creates a label and revalidates the board path", async () => {
    const { dbInsert, revalidatePath } = getBoardMocks();
    dbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([
            { id: 5, boardId, name: "Urgente", color: "#ff0000" },
          ]),
      }),
    });

    const label = await createLabelAction({
      boardId,
      name: "Urgente",
      color: "#ff0000",
    });

    expect(label).toEqual({
      id: 5,
      boardId,
      name: "Urgente",
      color: "#ff0000",
    });
    expect(dbInsert).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith(`/boards/${boardId}`);
  });

  it("rejects empty label names", async () => {
    const { dbInsert } = getBoardMocks();
    await expect(
      createLabelAction({
        boardId,
        name: "   ",
        color: "#ff0000",
      }),
    ).rejects.toThrow("El nombre de la etiqueta es obligatorio");

    expect(dbInsert).not.toHaveBeenCalled();
  });

  it("rejects invalid label colors", async () => {
    const { dbInsert } = getBoardMocks();
    await expect(
      createLabelAction({
        boardId,
        name: "Urgente",
        color: "red",
      }),
    ).rejects.toThrow("Color de etiqueta no válido");

    expect(dbInsert).not.toHaveBeenCalled();
  });
});

describe("deleteLabelAction", () => {
  beforeEach(() => {
    mockAuthenticatedUser();
    mockBoardAccessAllowed();
  });

  it("deletes an existing label", async () => {
    const { findFirstLabel, dbDelete, revalidatePath } = getBoardMocks();
    findFirstLabel.mockResolvedValue({
      id: 3,
      boardId,
      name: "Urgente",
      color: "#ff0000",
    });
    dbDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    await deleteLabelAction({ boardId, labelId: 3 });

    expect(dbDelete).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith(`/boards/${boardId}`);
  });

  it("throws when the label does not exist", async () => {
    const { findFirstLabel, dbDelete } = getBoardMocks();
    findFirstLabel.mockResolvedValue(null);

    await expect(deleteLabelAction({ boardId, labelId: 99 })).rejects.toThrow(
      "Etiqueta no encontrada",
    );

    expect(dbDelete).not.toHaveBeenCalled();
  });
});

describe("moveCardAction", () => {
  const cardId = 20;
  const toListId = 30;

  beforeEach(() => {
    mockAuthenticatedUser();
    mockBoardAccessAllowed();
  });

  it("throws when the card is missing", async () => {
    const { findFirstCard, dbUpdate } = getBoardMocks();
    findFirstCard.mockResolvedValue(null);

    await expect(
      moveCardAction({
        boardId,
        cardId,
        toListId,
        toPosition: 0,
        orderedCardIdsInTargetList: [cardId],
      }),
    ).rejects.toThrow("Tarjeta no encontrada");

    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it("throws when the target list is not on the board", async () => {
    const { findFirstCard, findFirstBoardList, dbUpdate } = getBoardMocks();
    findFirstCard.mockResolvedValue({
      id: cardId,
      title: "Tarea",
      listId: 1,
      list: { title: "Por hacer" },
    });
    findFirstBoardList.mockResolvedValue(null);

    await expect(
      moveCardAction({
        boardId,
        cardId,
        toListId,
        toPosition: 0,
        orderedCardIdsInTargetList: [cardId],
      }),
    ).rejects.toThrow("Lista no encontrada");

    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it("moves the card and revalidates the board path", async () => {
    const {
      findFirstCard,
      findFirstBoardList,
      findFirstBoard,
      dbUpdate,
      revalidatePath,
    } = getBoardMocks();
    findFirstCard.mockResolvedValue({
      id: cardId,
      title: "Tarea",
      listId: 1,
      list: { title: "Por hacer" },
    });
    findFirstBoardList.mockResolvedValue({
      id: toListId,
      boardId,
      title: "En progreso",
    });
    findFirstBoard.mockResolvedValue({
      competitionId: null,
      name: "Tablero",
      competition: null,
    });
    dbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    await moveCardAction({
      boardId,
      cardId,
      toListId,
      toPosition: 0,
      orderedCardIdsInTargetList: [cardId],
    });

    expect(dbUpdate).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith(`/boards/${boardId}`);
  });
});

describe("updateCardAction", () => {
  beforeEach(() => {
    mockAuthenticatedUser();
    mockBoardAccessAllowed();
  });

  it("updates card fields and revalidates", async () => {
    const { dbUpdate, revalidatePath } = getBoardMocks();
    dbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    await updateCardAction({
      boardId,
      cardId: 7,
      title: "Nuevo título",
    });

    expect(dbUpdate).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith(`/boards/${boardId}`);
  });
});
