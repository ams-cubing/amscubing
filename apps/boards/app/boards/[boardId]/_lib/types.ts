import type { getBoardForUser } from "@/lib/boards";

export type BoardDetail = NonNullable<
  Awaited<ReturnType<typeof getBoardForUser>>
>;

export type BoardCard = BoardDetail["lists"][number]["cards"][number];
export type BoardLabel = BoardDetail["labels"][number];

export type ColumnsState = Record<string, string[]>;

export function listKey(listId: number) {
  return `list:${listId}`;
}

export function cardKey(cardId: number) {
  return `card:${cardId}`;
}

export function parseListKey(key: string) {
  return Number(key.replace(/^list:/, ""));
}

export function parseCardKey(key: string) {
  return Number(key.replace(/^card:/, ""));
}

export function boardToColumns(board: BoardDetail): ColumnsState {
  const columns: ColumnsState = {};
  for (const list of board.lists) {
    columns[listKey(list.id)] = list.cards.map((card) => cardKey(card.id));
  }
  return columns;
}

export function flattenCards(board: BoardDetail) {
  const map = new Map<string, BoardCard>();
  for (const list of board.lists) {
    for (const card of list.cards) {
      map.set(cardKey(card.id), card);
    }
  }
  return map;
}

/** Phase relevance vs competition status for dimming off-phase cards */
export function isCardRelevantNow(
  card: BoardCard,
  statusPublic: string | null | undefined,
  statusInternal: string | null | undefined,
) {
  const colors = card.cardLabels.map((cl) => cl.label.color.toLowerCase());
  if (colors.length === 0) return true;

  const celebrated = statusInternal === "celebrated";
  const announced = statusPublic === "announced" || celebrated;

  // green = pre announce, red = post announce, blue = post celebrate, pink = resources
  const isGreen = colors.some((c) => c.includes("22c55e") || c === "#22c55e");
  const isRed = colors.some((c) => c.includes("ef4444") || c === "#ef4444");
  const isBlue = colors.some((c) => c.includes("3b82f6") || c === "#3b82f6");
  const isPink = colors.some((c) => c.includes("ec4899") || c === "#ec4899");

  if (isPink) return true;
  if (celebrated) return isBlue;
  if (announced) return isRed;
  return isGreen;
}
