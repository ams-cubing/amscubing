import { generateReactHelpers } from "@uploadthing/react";

import type { BoardsFileRouter } from "@/lib/uploadthing";

export const { useUploadThing, uploadFiles } =
  generateReactHelpers<BoardsFileRouter>();
