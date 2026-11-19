import {
  BUDGET_FINAL_CARD_TITLE,
  BUDGET_MID_CARD_TITLE,
  BUDGET_PLAN_CARD_TITLE,
  BUDGET_SPONSORS_CARD_TITLE,
} from "@workspace/db/data/ams-board-template";
import {
  CHAMPIONSHIP_BUDGET_MID_CARD_TITLE,
  CHAMPIONSHIP_BUDGET_SPONSORS_CARD_TITLE,
} from "@workspace/db/data/ams-championship-template";

export type BudgetCardMode = "plan" | "mid" | "final" | "sponsors";

const BUDGET_CARD_MODES: Record<string, BudgetCardMode> = {
  [BUDGET_PLAN_CARD_TITLE]: "plan",
  [BUDGET_MID_CARD_TITLE]: "mid",
  [BUDGET_FINAL_CARD_TITLE]: "final",
  [BUDGET_SPONSORS_CARD_TITLE]: "sponsors",
  [CHAMPIONSHIP_BUDGET_MID_CARD_TITLE]: "mid",
  [CHAMPIONSHIP_BUDGET_SPONSORS_CARD_TITLE]: "sponsors",
};

export function budgetCardMode(title: string): BudgetCardMode | null {
  return BUDGET_CARD_MODES[title.trim()] ?? null;
}
