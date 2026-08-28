import { describe, expect, it } from "vitest";

import {
  APPROVED_LIST_TITLE,
  HECHO_LIST_TITLE,
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
