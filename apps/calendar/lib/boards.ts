import { getBoardsUrl } from "@workspace/auth/urls";

export { getBoardsUrl };

/** When false, calendar hides AMS boards links, assign UI, and nav. */
export function isBoardsEnabled() {
  return process.env.NEXT_PUBLIC_BOARDS_ENABLED === "true";
}
