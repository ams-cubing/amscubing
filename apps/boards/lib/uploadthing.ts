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
import { recordUpload } from "@workspace/db/uploads";
import type { User } from "@workspace/db/schema";
import { log } from "@workspace/server/log";

const f = createUploadthing();

async function trackUpload(
  route: "socialFlyer" | "cardAttachment",
  userId: string,
  file: { key: string; name: string },
  url: string,
) {
  try {
    await recordUpload({
      key: file.key,
      url,
      name: file.name,
      app: "boards",
      route,
      userId,
    });
  } catch (error) {
    log.error("upload.record_failed", { app: "boards", key: file.key, error });
  }
}

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
    .onUploadComplete(async ({ metadata, file }) => {
      const url = file.ufsUrl ?? file.url;
      await trackUpload("socialFlyer", metadata.userId, file, url);
      return { url, name: file.name };
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
      await trackUpload("cardAttachment", metadata.userId, file, url);
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
