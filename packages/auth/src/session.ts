import { headers } from "next/headers";
import { unauthorized } from "next/navigation";

import type { User } from "@workspace/db/schema";

import type { Auth } from "./auth";
import { toSessionUser, type RawSessionUser } from "./types";

export type AuthSession = {
  session: NonNullable<
    Awaited<ReturnType<Auth["api"]["getSession"]>>
  >["session"];
  user: User;
};

export type SessionResult =
  | { ok: true; session: AuthSession }
  | { ok: false; message: string };

export function createSessionHelpers(auth: Auth) {
  async function requireSession(): Promise<SessionResult> {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { ok: false, message: "No autenticado" };
    }

    return {
      ok: true,
      session: {
        session: session.session,
        user: toSessionUser(session.user as RawSessionUser),
      },
    };
  }

  async function requireDelegate(): Promise<SessionResult> {
    const result = await requireSession();

    if (!result.ok) {
      return result;
    }

    if (result.session.user.role !== "delegate") {
      return {
        ok: false,
        message: "Solo delegados pueden realizar esta acción",
      };
    }

    return result;
  }

  async function requireSessionOrUnauthorized(): Promise<AuthSession> {
    const result = await requireSession();
    if (!result.ok) {
      unauthorized();
      throw new Error("No autenticado");
    }
    return result.session;
  }

  return {
    requireSession,
    requireDelegate,
    requireSessionOrUnauthorized,
  };
}
