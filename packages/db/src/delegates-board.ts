/**
 * The delegates board is the one board for WCA delegates' general tasks (not
 * tied to a competition). It is identified by its reserved name, so the name
 * cannot be taken by another board and the board itself cannot be renamed.
 */
export const DELEGATES_BOARD_NAME = "Pendientes de delegados";

export function isDelegatesBoardName(name: string) {
  return (
    name.trim().toLocaleLowerCase("es") ===
    DELEGATES_BOARD_NAME.toLocaleLowerCase("es")
  );
}

export function isDelegatesBoard(board: {
  name: string;
  isTemplate: boolean;
  competitionId: number | null;
}) {
  return (
    !board.isTemplate &&
    board.competitionId === null &&
    isDelegatesBoardName(board.name)
  );
}
