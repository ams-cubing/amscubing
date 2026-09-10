import { eq } from "drizzle-orm";

import { db } from "@workspace/db";
import { boardsOrganizerAllowlist } from "@workspace/db/schema";

/**
 * Pilot access to AMS boards via WCA ID allowlist.
 *
 * Primary source: `boards_organizer_allowlist` (managed in /admin/tableros).
 * Temporary override: `BOARDS_ORGANIZER_ALLOWLIST` — comma-separated WCA IDs
 * (server-only, additive with the DB table during migration/ops).
 *
 * - Delegates always allowed.
 * - Empty DB + empty env → blocked for all non-delegates.
 * - Removable when Tableros opens to all signed-in organizers.
 */

/** Env-only set. Prefer `/admin/tableros`; keep for temporary additive override. */
export function getBoardsOrganizerAllowlist(): Set<string> {
  const raw = process.env.BOARDS_ORGANIZER_ALLOWLIST?.trim() ?? "";
  if (!raw) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((id) => id.trim().toUpperCase())
      .filter((id) => id.length > 0),
  );
}

export async function isWcaIdOnBoardsAllowlist(
  wcaId: string,
): Promise<boolean> {
  const normalized = wcaId.trim().toUpperCase();
  if (!normalized) {
    return false;
  }

  if (getBoardsOrganizerAllowlist().has(normalized)) {
    return true;
  }

  const row = await db.query.boardsOrganizerAllowlist.findFirst({
    where: eq(boardsOrganizerAllowlist.wcaId, normalized),
    columns: { wcaId: true },
  });

  return Boolean(row);
}

export async function canAccessBoardsApp(
  user: { role: string; wcaId: string } | null | undefined,
): Promise<boolean> {
  if (!user) {
    return false;
  }

  if (user.role === "delegate") {
    return true;
  }

  return isWcaIdOnBoardsAllowlist(user.wcaId);
}
