import { FINAL_EMAIL_CARD_TITLE } from "@workspace/db/data/ams-board-template";
import { CHAMPIONSHIP_FINAL_EMAIL_CARD_TITLE } from "@workspace/db/data/ams-championship-template";

const FINAL_EMAIL_TITLES = new Set([
  FINAL_EMAIL_CARD_TITLE,
  CHAMPIONSHIP_FINAL_EMAIL_CARD_TITLE,
]);

export function isFinalEmailCard(title: string) {
  return FINAL_EMAIL_TITLES.has(title.trim());
}
