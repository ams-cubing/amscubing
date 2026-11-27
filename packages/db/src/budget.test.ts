import { describe, expect, it } from "vitest";

import {
  countPayingCompetitors,
  duesCents,
  stripeFeeCents,
  summarizeBudgetLines,
} from "./budget";
import { parseMxnToCents, resolveLineTotalCents } from "./budget-labels";

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

describe("duesCents", () => {
  it("uses $10 MXN floor when 5% of fee is lower", () => {
    expect(duesCents(100_00, 1)).toBe(10_00);
    expect(duesCents(100_00, 50)).toBe(500_00);
  });

  it("uses 5% when it exceeds the floor", () => {
    expect(duesCents(300_00, 1)).toBe(15_00);
    expect(duesCents(300_00, 40)).toBe(600_00);
  });

  it("returns 0 for non-positive competitor counts", () => {
    expect(duesCents(300_00, 0)).toBe(0);
    expect(duesCents(300_00, -1)).toBe(0);
  });

  it("does not inflate when revenue includes donations (fee × paying only)", () => {
    // 80 paying at $120 → dues from fee×count, not from a higher donated revenue
    expect(duesCents(120_00, 80)).toBe(80 * 10_00); // 5% of 120 = 6 < 10 → floor
    expect(duesCents(300_00, 80)).toBe(80 * 15_00);
  });
});

describe("stripeFeeCents", () => {
  it("computes 3.6% + $3 MXN per charge", () => {
    expect(stripeFeeCents(12_000_00, 100)).toBe(732_00);
  });

  it("includes refunded charges in gross and charge count", () => {
    // 80 paying kept revenue $10,000 + 5 refunds × $120 fee
    const revenue = 10_000_00;
    const fee = 120_00;
    const refunded = 5;
    const gross = revenue + refunded * fee;
    const charges = 80 + refunded;
    expect(stripeFeeCents(gross, charges)).toBe(
      Math.round((gross * 360) / 10_000) + 300 * charges,
    );
  });
});

describe("resolveLineTotalCents", () => {
  it("uses qty × unit when both are set", () => {
    expect(
      resolveLineTotalCents({
        quantity: 3,
        unitCents: 200_00,
        fallbackCents: 999_00,
      }),
    ).toBe(600_00);
  });

  it("falls back to explicit total when qty/unit incomplete", () => {
    expect(
      resolveLineTotalCents({
        quantity: null,
        unitCents: 200_00,
        fallbackCents: 150_00,
      }),
    ).toBe(150_00);
    expect(
      resolveLineTotalCents({
        quantity: 0,
        unitCents: 200_00,
        fallbackCents: 150_00,
      }),
    ).toBe(150_00);
  });
});

describe("countPayingCompetitors", () => {
  it("excludes free-entry staff roles", () => {
    const counts = countPayingCompetitors([
      {
        roles: [],
        registration: { status: "accepted", isCompeting: true },
      },
      {
        roles: ["delegate"],
        registration: { status: "accepted", isCompeting: true },
      },
      {
        roles: ["organizer"],
        registration: { status: "accepted", isCompeting: true },
      },
      {
        roles: [],
        registration: { status: "pending", isCompeting: true },
      },
    ]);
    expect(counts.acceptedCompeting).toBe(3);
    expect(counts.excludedStaff).toBe(2);
    expect(counts.payingCompetitors).toBe(1);
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
