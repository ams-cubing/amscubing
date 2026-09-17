import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  assertBoardUploadAccess,
  assertCardBelongsToBoard,
  insertUploadedCardAttachment,
} from "@/lib/uploadthing-attachments";
import type { User } from "@workspace/db/schema";

const f = createUploadthing();

async function requireUploadUser(boardId: number) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    throw new UploadThingError("No autenticado");
  }

  try {
    await assertBoardUploadAccess(session.user as User, boardId);
  } catch (error) {
    throw new UploadThingError(
      error instanceof Error ? error.message : "Sin acceso al tablero",
    );
  }

  return { userId: session.user.id, boardId };
}

export const boardsFileRouter = {
  socialFlyer: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .input(z.object({ boardId: z.number().int().positive() }))
    .middleware(async ({ input }) => requireUploadUser(input.boardId))
    .onUploadComplete(async ({ file }) => {
      return {
        url: file.ufsUrl ?? file.url,
        name: file.name,
      };
    }),

  cardAttachment: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 4,
    },
    pdf: {
      maxFileSize: "8MB",
      maxFileCount: 4,
    },
  })
    .input(
      z.object({
        boardId: z.number().int().positive(),
        cardId: z.number().int().positive(),
      }),
    )
    .middleware(async ({ input }) => {
      const authMeta = await requireUploadUser(input.boardId);
      try {
        await assertCardBelongsToBoard(input.boardId, input.cardId);
      } catch (error) {
        throw new UploadThingError(
          error instanceof Error ? error.message : "Tarjeta no encontrada",
        );
      }
      return { ...authMeta, cardId: input.cardId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const url = file.ufsUrl ?? file.url;
      const saved = await insertUploadedCardAttachment({
        boardId: metadata.boardId,
        cardId: metadata.cardId,
        name: file.name,
        url,
      });
      return saved;
    }),
} satisfies FileRouter;

export type BoardsFileRouter = typeof boardsFileRouter;
