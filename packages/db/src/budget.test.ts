import { describe, expect, it } from "vitest";

import { summarizeBudgetLines } from "./budget";
import { parseMxnToCents } from "./budget-labels";

describe("summarizeBudgetLines", () => {
  it("computes nets and break-even from fee", () => {
    const summary = summarizeBudgetLines(
      [
        {
          kind: "expense",
          category: "sede",
          expectedCents: 500_00,
          actualCents: 480_00,
        },
        {
          kind: "expense",
          category: "cuota_wca",
          expectedCents: 50_00,
          actualCents: 50_00,
        },
        {
          kind: "income",
          category: "inscripciones",
          expectedCents: 1000_00,
          actualCents: 900_00,
        },
        {
          kind: "income",
          category: "patrocinio_efectivo",
          expectedCents: 200_00,
          actualCents: 200_00,
        },
      ],
      100_00,
    );

    expect(summary.expectedExpenseCents).toBe(550_00);
    expect(summary.expectedIncomeCents).toBe(1200_00);
    expect(summary.expectedNetCents).toBe(650_00);
    expect(summary.actualNetCents).toBe(570_00);
    // uncovered = 55000 - 20000 = 35000 → 4 competitors at 10000
    expect(summary.breakEvenCompetitors).toBe(4);
  });
});

describe("parseMxnToCents", () => {
  it("parses pesos to centavos", () => {
    expect(parseMxnToCents("150")).toBe(150_00);
    expect(parseMxnToCents("150.50")).toBe(150_50);
    expect(parseMxnToCents("$1,200.50")).toBe(1200_50);
    expect(parseMxnToCents("")).toBe(0);
    expect(parseMxnToCents("-1")).toBeNull();
  });
});
