import { db } from "./index";
import { uploadedFiles } from "./schema";

export type RecordUploadInput = {
  key: string;
  url: string;
  name: string;
  app: (typeof uploadedFiles.$inferInsert)["app"];
  route: string;
  userId: string | null;
};

type Executor = Pick<typeof db, "insert">;

/** Idempotent: UploadThing may retry `onUploadComplete` for the same key. */
export async function recordUpload(
  input: RecordUploadInput,
  executor: Executor = db,
) {
  await executor
    .insert(uploadedFiles)
    .values({
      key: input.key,
      url: input.url,
      name: input.name,
      app: input.app,
      route: input.route,
      uploaderUserId: input.userId,
    })
    .onConflictDoNothing({ target: uploadedFiles.key });
}
