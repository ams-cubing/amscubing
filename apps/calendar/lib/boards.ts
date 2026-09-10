import { getBoardsUrl } from "@workspace/auth/urls";

export { getBoardsUrl };

/** When false, calendar hides AMS boards links, assign UI, and nav. */
export function isBoardsEnabled() {
  return process.env.NEXT_PUBLIC_BOARDS_ENABLED === "true";
}

/**
 * Pilot organizer WCA IDs (comma-separated). Server-only — do not use
 * NEXT_PUBLIC_*. Empty / unset means general availability for signed-in users.
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

/**
 * Whether the calendar sidebar should show the Tableros AMS link.
 * Compute on the server and pass into client components.
 */
export function canSeeBoardsNav(
  user: { role: string; wcaId: string } | null | undefined,
): boolean {
  if (!isBoardsEnabled() || !user) {
    return false;
  }

  if (user.role === "delegate") {
    return true;
  }

  const allowlist = getBoardsOrganizerAllowlist();
  if (allowlist.size === 0) {
    return true;
  }

  return allowlist.has(user.wcaId.trim().toUpperCase());
}
