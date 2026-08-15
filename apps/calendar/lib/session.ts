import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export type AuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export type SessionResult =
  | { ok: true; session: AuthSession }
  | { ok: false; message: string };

export async function requireSession(): Promise<SessionResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { ok: false, message: "No autenticado" };
  }

  return { ok: true, session };
}

export async function requireDelegate(): Promise<SessionResult> {
  const result = await requireSession();

  if (!result.ok) {
    return result;
  }

  if (result.session.user.role !== "delegate") {
    return { ok: false, message: "Solo delegados pueden realizar esta acción" };
  }

  return result;
}
