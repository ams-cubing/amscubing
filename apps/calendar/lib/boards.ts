import { canAccessBoardsApp } from "@workspace/auth/boards-access";

export {
  canAccessBoardsApp,
  getBoardsOrganizerAllowlist,
} from "@workspace/auth/boards-access";

/**
 * Whether the calendar sidebar should show the Tableros AMS link.
 * Compute on the server and pass into client components.
 * Do not import this module from client components — use `@/lib/urls` for getBoardsUrl.
 */
export async function canSeeBoardsNav(
  user: { role: string; wcaId: string } | null | undefined,
): Promise<boolean> {
  return canAccessBoardsApp(user);
}
