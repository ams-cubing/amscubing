import { COMPETITION_DETAILS_CARD_TITLE } from "@workspace/db/data/ams-board-template";

export function isCompetitionDetailsCard(title: string): boolean {
  return title.trim() === COMPETITION_DETAILS_CARD_TITLE;
}
