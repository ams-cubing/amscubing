import { canAccessBoardsApp } from "@workspace/auth/boards-access";
import { getBoardsUrl } from "@workspace/auth/urls";

export { getBoardsUrl };
export {
  canAccessBoardsApp,
  getBoardsOrganizerAllowlist,
} from "@workspace/auth/boards-access";

/**
 * Whether the calendar sidebar should show the Tableros AMS link.
 * Compute on the server and pass into client components.
 */
export function canSeeBoardsNav(
  user: { role: string; wcaId: string } | null | undefined,
): boolean {
  return canAccessBoardsApp(user);
}
