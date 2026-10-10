import { createRouteHandler } from "uploadthing/next";
import { blogFileRouter } from "@/lib/uploadthing";

export const { GET, POST } = createRouteHandler({
  router: blogFileRouter,
});
