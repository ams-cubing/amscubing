import { describe, expect, it } from "vitest";

import { COMPETITION_BOARD_TEMPLATE } from "./data/ams-board-template";
import { CHAMPIONSHIP_BOARD_TEMPLATE } from "./data/ams-championship-template";
import {
  APPROVED_LIST_TITLE,
  HECHO_LIST_TITLE,
  cardPhase,
  isListTitle,
  normalizeListTitle,
} from "./board-readiness";

describe("list title helpers", () => {
  it("normalizes titles", () => {
    expect(normalizeListTitle("  Hecho ")).toBe("hecho");
  });

  it("matches template list titles", () => {
    expect(isListTitle("hecho", HECHO_LIST_TITLE)).toBe(true);
    expect(isListTitle("Aprobado", APPROVED_LIST_TITLE)).toBe(true);
    expect(isListTitle("Por Hacer", HECHO_LIST_TITLE)).toBe(false);
  });
});

describe("cardPhase", () => {
  it("counts during-competition cards as post-celebration", () => {
    expect(cardPhase(["#5e4db2"])).toBe("post_celebrate");
    expect(cardPhase(["#5e4db2", "#9f8fef"])).toBe("post_celebrate");
  });
});

describe.each([COMPETITION_BOARD_TEMPLATE, CHAMPIONSHIP_BOARD_TEMPLATE])(
  "$key template",
  (template) => {
    const colorByKey = new Map(template.labels.map((l) => [l.key, l.color]));
    const phaseByLabelKey: Record<string, string> = {
      pre_announce: "pre_announce",
      pre_organization: "pre_announce",
      post_announce: "post_announce",
      post_celebrate: "post_celebrate",
      during_competition: "post_celebrate",
      resources: "resources",
    };
    const phasePrecedence = [
      "resources",
      "post_celebrate",
      "post_announce",
      "pre_announce",
    ];

    it("has unique card titles and known lists and labels", () => {
      const titles = template.cards.map((card) => card.title);
      expect(new Set(titles).size).toBe(titles.length);
      for (const card of template.cards) {
        expect(template.lists).toContain(card.list);
        for (const key of card.labels) expect(colorByKey.has(key)).toBe(true);
      }
    });

    it("puts every card in the phase of its phase label", () => {
      for (const card of template.cards) {
        const phases = card.labels
          .map((key) => phaseByLabelKey[key])
          .filter(Boolean);
        expect(phases.length, card.title).toBeGreaterThan(0);
        const expected = phasePrecedence.find((phase) =>
          phases.includes(phase),
        );
        const colors = card.labels.map((key) => colorByKey.get(key)!);
        expect(cardPhase(colors), card.title).toBe(expected);
      }
    });
  },
);
