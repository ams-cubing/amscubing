import {
  STAFF_PLANNING_CARD_TITLE,
  STAFF_TRAINING_CARD_TITLE,
} from "@workspace/db/data/ams-board-template";
import {
  CHAMPIONSHIP_STAFF_PLANNING_CARD_TITLE,
  CHAMPIONSHIP_STAFF_TRAINING_CARD_TITLE,
} from "@workspace/db/data/ams-championship-template";

export type StaffCardMode = "planning" | "training";

const STAFF_CARD_MODES: Record<string, StaffCardMode> = {
  [STAFF_PLANNING_CARD_TITLE]: "planning",
  [CHAMPIONSHIP_STAFF_PLANNING_CARD_TITLE]: "planning",
  [STAFF_TRAINING_CARD_TITLE]: "training",
  [CHAMPIONSHIP_STAFF_TRAINING_CARD_TITLE]: "training",
};

export function staffCardMode(title: string): StaffCardMode | null {
  return STAFF_CARD_MODES[title.trim()] ?? null;
}
