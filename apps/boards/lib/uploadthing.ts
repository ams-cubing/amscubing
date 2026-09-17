import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { canAccessBoard } from "@/lib/boards";
import type { User } from "@workspace/db/schema";

const f = createUploadthing();

export const boardsFileRouter = {
  socialFlyer: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .input(z.object({ boardId: z.number().int().positive() }))
    .middleware(async ({ input }) => {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session?.user) {
        throw new UploadThingError("No autenticado");
      }

      const allowed = await canAccessBoard(
        session.user as User,
        input.boardId,
      );
      if (!allowed) {
        throw new UploadThingError("Sin acceso al tablero");
      }

      return { userId: session.user.id, boardId: input.boardId };
    })
    .onUploadComplete(async ({ file }) => {
      return {
        url: file.ufsUrl ?? file.url,
        name: file.name,
      };
    }),
} satisfies FileRouter;

export type BoardsFileRouter = typeof boardsFileRouter;
