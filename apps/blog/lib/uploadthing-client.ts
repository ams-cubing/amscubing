import { generateReactHelpers } from "@uploadthing/react";
import type { BlogFileRouter } from "@/lib/uploadthing";

export const { useUploadThing } = generateReactHelpers<BlogFileRouter>();
