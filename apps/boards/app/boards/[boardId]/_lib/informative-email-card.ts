import { INFORMATIVE_EMAIL_CARD_TITLE } from "@workspace/db/data/ams-board-template";
import { CHAMPIONSHIP_INFORMATIVE_EMAIL_CARD_TITLE } from "@workspace/db/data/ams-championship-template";

const INFORMATIVE_EMAIL_TITLES = new Set([
  INFORMATIVE_EMAIL_CARD_TITLE,
  CHAMPIONSHIP_INFORMATIVE_EMAIL_CARD_TITLE,
]);

export function isInformativeEmailCard(title: string) {
  return INFORMATIVE_EMAIL_TITLES.has(title.trim());
}
