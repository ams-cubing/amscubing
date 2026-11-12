/** Client-safe template keys and shapes shared by the AMS board templates. */

export const BOARD_TEMPLATE_KEYS = ["competition", "championship"] as const;

export type BoardTemplateKey = (typeof BOARD_TEMPLATE_KEYS)[number];

export const BOARD_TEMPLATE_LABELS: Record<BoardTemplateKey, string> = {
  competition: "Competencia",
  championship: "Campeonato",
};

export function isBoardTemplateKey(value: unknown): value is BoardTemplateKey {
  return (
    typeof value === "string" &&
    (BOARD_TEMPLATE_KEYS as readonly string[]).includes(value)
  );
}

export type BoardTemplateLabel = {
  key: string;
  name: string;
  color: string;
};

export type BoardTemplateCard<
  LabelKey extends string = string,
  ListTitle extends string = string,
> = {
  title: string;
  list: ListTitle;
  labels: LabelKey[];
  description?: string;
  checklist?: { title: string; items: string[] };
  attachments?: { name: string; url: string }[];
  coverUrl?: string;
};

export type BoardTemplateDefinition = {
  key: BoardTemplateKey;
  name: string;
  labels: readonly BoardTemplateLabel[];
  lists: readonly string[];
  cards: readonly BoardTemplateCard[];
  /** Seed deletes leftover cards with these titles. */
  retiredCardTitles: readonly string[];
};
