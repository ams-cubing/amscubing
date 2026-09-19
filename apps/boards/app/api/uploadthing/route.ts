import { createRouteHandler } from "uploadthing/next";

import { boardsFileRouter } from "@/lib/uploadthing";

export const { GET, POST } = createRouteHandler({
  router: boardsFileRouter,
});
