import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { consumeRateLimit } from "@workspace/db/rate-limit";
import { getViewer } from "@/lib/auth";

const f = createUploadthing();

export const blogFileRouter = {
  blogImage: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const viewer = await getViewer();
      if (!viewer?.canManage) throw new UploadThingError("Sin permiso");
      const { allowed } = await consumeRateLimit({
        key: `blog:upload:user:${viewer.id}`,
        windowMs: 10 * 60 * 1000,
        max: 30,
      });
      if (!allowed)
        throw new UploadThingError("Demasiadas cargas. Espera unos minutos.");
      return { userId: viewer.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl ?? file.url };
    }),
} satisfies FileRouter;

export type BlogFileRouter = typeof blogFileRouter;
