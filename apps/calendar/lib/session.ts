import { createSessionHelpers } from "@workspace/auth/session";

import { auth } from "./auth";

export const { requireSession, requireDelegate, requireSessionOrUnauthorized } =
  createSessionHelpers(auth);

export type { AuthSession, SessionResult } from "@workspace/auth/session";
