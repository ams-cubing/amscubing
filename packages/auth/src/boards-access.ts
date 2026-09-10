/**
 * Pilot access to AMS boards via WCA ID allowlist.
 *
 * BOARDS_ORGANIZER_ALLOWLIST — comma-separated WCA IDs (server-only).
 * - Delegates always allowed.
 * - Empty / unset → blocked for all non-delegates.
 * - Non-empty → non-delegates allowed only if listed.
 */

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

export function canAccessBoardsApp(
  user: { role: string; wcaId: string } | null | undefined,
): boolean {
  if (!user) {
    return false;
  }

  if (user.role === "delegate") {
    return true;
  }

  const allowlist = getBoardsOrganizerAllowlist();
  if (allowlist.size === 0) {
    return false;
  }

  return allowlist.has(user.wcaId.trim().toUpperCase());
}
