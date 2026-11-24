/**
 * Pure board-readiness helpers safe for client components.
 * Keep DB access in `board-readiness.ts`.
 */

import {
  TEMPLATE_LISTS,
  VENUE_PERMISSION_CARD_TITLE,
} from "./data/ams-board-template";

export { VENUE_PERMISSION_CARD_TITLE };

export const APPROVED_LIST_TITLE = TEMPLATE_LISTS[3]; // Aprobado
export const HECHO_LIST_TITLE = TEMPLATE_LISTS[2]; // Hecho
export const RESOURCES_LIST_TITLE = TEMPLATE_LISTS[4]; // Recursos

export function normalizeListTitle(title: string) {
  return title.trim().toLowerCase();
}

export function isListTitle(title: string, expected: string) {
  return normalizeListTitle(title) === normalizeListTitle(expected);
}

type PhaseKey =
  | "pre_announce"
  | "post_announce"
  | "post_celebrate"
  | "resources";

/** Infer readiness phase from AMS label colors (championship area labels excluded). */
export function cardPhase(labelColors: string[]): PhaseKey | null {
  if (labelColors.length === 0) return "pre_announce";

  const isPink = labelColors.some(
    (c) => c.includes("ec4899") || c === "#ec4899",
  );
  if (isPink) return "resources";

  const isBlue = labelColors.some(
    (c) => c.includes("3b82f6") || c === "#3b82f6",
  );
  if (isBlue) return "post_celebrate";

  // During-competition cards only get approved once the event happened.
  const isPurple = labelColors.some(
    (c) => c.includes("5e4db2") || c === "#5e4db2",
  );
  if (isPurple) return "post_celebrate";

  const isRed = labelColors.some(
    (c) => c.includes("ef4444") || c === "#ef4444",
  );
  if (isRed) return "post_announce";

  const isGreen = labelColors.some(
    (c) => c.includes("22c55e") || c === "#22c55e",
  );
  if (isGreen) return "pre_announce";

  const isYellow = labelColors.some(
    (c) => c.includes("eab308") || c === "#eab308",
  );
  if (isYellow) return "pre_announce";

  return "pre_announce";
}
