import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getBoardMocks,
  resetBoardMocks,
} from "@/test/setup-server-mocks";

import {
  assertBoardUploadAccess,
  assertCardBelongsToBoard,
  insertUploadedCardAttachment,
} from "@/lib/uploadthing-attachments";

const boardId = 10;
const cardId = 7;

beforeEach(() => {
  resetBoardMocks();
});

describe("assertBoardUploadAccess", () => {
  it("rejects users without board access", async () => {
    const { canAccessBoard } = getBoardMocks();
    canAccessBoard.mockResolvedValue(false);

    await expect(
      assertBoardUploadAccess(
        { id: "u1", role: "user", wcaId: "2020TEST01" } as never,
        boardId,
      ),
    ).rejects.toThrow("Sin acceso al tablero");
  });

  it("rejects archived boards", async () => {
    const { canAccessBoard, isBoardArchived } = getBoardMocks();
    canAccessBoard.mockResolvedValue(true);
    isBoardArchived.mockResolvedValue(true);

    await expect(
      assertBoardUploadAccess(
        { id: "u1", role: "user", wcaId: "2020TEST01" } as never,
        boardId,
      ),
    ).rejects.toThrow("Este tablero está archivado y no se puede editar");
  });
});

describe("assertCardBelongsToBoard", () => {
  it("rejects cards on another board", async () => {
    const { findFirstCard } = getBoardMocks();
    findFirstCard.mockResolvedValue({
      id: cardId,
      list: { boardId: 99 },
    });

    await expect(assertCardBelongsToBoard(boardId, cardId)).rejects.toThrow(
      "Tarjeta no encontrada",
    );
  });

  it("accepts cards on the board", async () => {
    const { findFirstCard } = getBoardMocks();
    findFirstCard.mockResolvedValue({
      id: cardId,
      list: { boardId },
    });

    await expect(assertCardBelongsToBoard(boardId, cardId)).resolves.toEqual({
      id: cardId,
      list: { boardId },
    });
  });
});

describe("insertUploadedCardAttachment", () => {
  it("inserts attachment and revalidates board path", async () => {
    const { dbInsert, revalidatePath } = getBoardMocks();
    const values = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 55 }]),
    });
    dbInsert.mockReturnValue({ values });

    const result = await insertUploadedCardAttachment({
      boardId,
      cardId,
      name: "  flyer.png  ",
      url: " https://utfs.io/f/flyer.png ",
    });

    expect(values).toHaveBeenCalledWith({
      cardId,
      name: "flyer.png",
      url: "https://utfs.io/f/flyer.png",
    });
    expect(result).toEqual({
      attachmentId: 55,
      name: "flyer.png",
      url: "https://utfs.io/f/flyer.png",
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/boards/${boardId}`);
  });
});
