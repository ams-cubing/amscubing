import {
  CATEGORIES_CARD_TITLE,
  SCHEDULE_CARD_TITLE,
} from "@workspace/db/data/ams-board-template";

/** Titles that show the Categorías format editor. */
const CATEGORIES_TITLES = new Set([
  CATEGORIES_CARD_TITLE,
  /** Pre-split merged title; sync renames to Categorías. */
  "Categorías y Horario",
]);

/** Titles that show the Horario round-calculations section. */
const SCHEDULE_TITLES = new Set([SCHEDULE_CARD_TITLE]);

export function isCategoriesCard(title: string): boolean {
  return CATEGORIES_TITLES.has(title.trim());
}

export function isScheduleCard(title: string): boolean {
  return SCHEDULE_TITLES.has(title.trim());
}

/** @deprecated Prefer isCategoriesCard / isScheduleCard. */
export function isCategoriesScheduleCard(title: string): boolean {
  return isCategoriesCard(title) || isScheduleCard(title);
}
