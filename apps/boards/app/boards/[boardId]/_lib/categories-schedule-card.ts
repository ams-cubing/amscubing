import { CATEGORIES_SCHEDULE_CARD_TITLE } from "@workspace/db/data/ams-board-template";

/** Titles that show the categorías / horario format section. */
const CATEGORIES_SCHEDULE_TITLES = new Set([
  CATEGORIES_SCHEDULE_CARD_TITLE,
  "Horario",
  "Categorías",
]);

export function isCategoriesScheduleCard(title: string): boolean {
  return CATEGORIES_SCHEDULE_TITLES.has(title.trim());
}
