import { createSessionHelpers } from "@workspace/auth/session";

import { auth } from "@/lib/auth";

export const {
  requireSession,
  requireDelegate,
  requireEditorOrDelegate,
  requireSessionOrUnauthorized,
} = createSessionHelpers(auth);
