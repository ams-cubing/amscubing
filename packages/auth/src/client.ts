import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

import { getCalendarUrl } from "./urls";

/**
 * Auth client that talks to the canonical calendar auth host so sign-in /
 * sign-out set the shared `ams.*` session cookie for both apps.
 */
export function createAmsAuthClient(options?: { baseURL?: string }) {
  return createAuthClient({
    baseURL: options?.baseURL ?? getCalendarUrl(),
    plugins: [genericOAuthClient()],
  });
}
