import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { consumeRateLimit } from "@workspace/db/rate-limit";
import { recordUpload } from "@workspace/db/uploads";
import { log } from "@workspace/server/log";
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
    .onUploadComplete(async ({ metadata, file }) => {
      const url = file.ufsUrl ?? file.url;
      try {
        await recordUpload({
          key: file.key,
          url,
          name: file.name,
          app: "blog",
          route: "blogImage",
          userId: metadata.userId,
        });
      } catch (error) {
        log.error("upload.record_failed", {
          app: "blog",
          key: file.key,
          error,
        });
      }
      return { url };
    }),
} satisfies FileRouter;

export type BlogFileRouter = typeof blogFileRouter;
