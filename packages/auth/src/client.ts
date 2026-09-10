import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

import { getAuthBaseUrl } from "./urls";

/** Auth client that talks to the canonical auth host for the shared `ams.*` session cookie. */
export function createAmsAuthClient(options?: { baseURL?: string }) {
  return createAuthClient({
    baseURL: options?.baseURL ?? getAuthBaseUrl(),
    plugins: [genericOAuthClient()],
  });
}
