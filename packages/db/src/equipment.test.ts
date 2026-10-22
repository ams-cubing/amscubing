import { describe, expect, it } from "vitest";

import {
  assertBulkAvailable,
  assertItemsConfirmable,
  assertItemsLendable,
  assertRequestConfirmable,
  availableQuantity,
  EquipmentError,
  formatSku,
  getLoanStatus,
  groupByGuardian,
  isReservationActive,
  maxSkuSequence,
  nextRequestStatus,
  normalizeRequestLines,
  parseSku,
  pickUnits,
  skuRange,
  summarizeInventory,
  todayInMexico,
  type EquipmentItemRow,
  type EquipmentStockRow,
  type LoanCandidateItem,
} from "./equipment";
import type { EquipmentType } from "./schema";

describe("SKU", () => {
  it("formats prefix, two-digit year and sequence like the sheet", () => {
    expect(formatSku("DS3", 2023, 1)).toBe("DS3-2301");
    expect(formatSku("SG4", 2023, 13)).toBe("SG4-2313");
    expect(formatSku("DPQ", 2026, 7)).toBe("DPQ-2607");
  });

  it("grows past two digits instead of wrapping", () => {
    expect(formatSku("DS3", 2023, 100)).toBe("DS3-23100");
  });

  it("parses legacy codes and rejects malformed ones", () => {
    expect(parseSku("DS3-2318")).toEqual({
      prefix: "DS3",
      year: 2023,
      sequence: 18,
    });
    expect(parseSku(" sg5c-2405 ")).toEqual({
      prefix: "SG5C",
      year: 2024,
      sequence: 5,
    });
    expect(parseSku("DS3-23100")?.sequence).toBe(100);
    expect(parseSku("DS3")).toBeNull();
    expect(parseSku("DS3-1")).toBeNull();
  });

  it("builds a consecutive range from a reserved start", () => {
    expect(skuRange("DPQ", 2023, 9, 3)).toEqual([
      "DPQ-2309",
      "DPQ-2310",
      "DPQ-2311",
    ]);
    expect(skuRange("DPQ", 2023, 9, 0)).toEqual([]);
  });

  it("finds the highest sequence for a prefix and year only", () => {
    const skus = ["DS3-2301", "DS3-2318", "DS3-2402", "DPQ-2340", "junk"];
    expect(maxSkuSequence(skus, "DS3", 2023)).toBe(18);
    expect(maxSkuSequence(skus, "DS3", 2024)).toBe(2);
    expect(maxSkuSequence(skus, "SG4", 2023)).toBe(0);
  });
});

describe("todayInMexico", () => {
  it("uses Mexico City time, not UTC", () => {
    // 2026-01-01 03:00 UTC is still Dec 31 in Mexico City (UTC-6).
    expect(todayInMexico(new Date("2026-01-01T03:00:00Z"))).toBe("2025-12-31");
  });
});

describe("getLoanStatus", () => {
  const open = { quantity: 8, returnedQuantity: 0 };

  it("is active while nothing is returned and not past due", () => {
    expect(
      getLoanStatus(
        { returnedAt: null, dueAt: "2026-11-01" },
        [open],
        "2026-10-21",
      ),
    ).toBe("active");
    expect(
      getLoanStatus({ returnedAt: null, dueAt: null }, [open], "2030-01-01"),
    ).toBe("active");
  });

  it("is overdue after the due date, even if partially returned", () => {
    expect(
      getLoanStatus(
        { returnedAt: null, dueAt: "2026-10-01" },
        [{ quantity: 8, returnedQuantity: 3 }],
        "2026-10-21",
      ),
    ).toBe("overdue");
  });

  it("is partial when some lines or quantities came back", () => {
    expect(
      getLoanStatus(
        { returnedAt: null, dueAt: null },
        [open, { quantity: 1, returnedQuantity: 1 }],
        "2026-10-21",
      ),
    ).toBe("partial");
  });

  it("is returned once every line is closed", () => {
    expect(
      getLoanStatus(
        { returnedAt: null, dueAt: "2026-10-01" },
        [{ quantity: 2, returnedQuantity: 2 }],
        "2026-10-21",
      ),
    ).toBe("returned");
    expect(
      getLoanStatus(
        { returnedAt: new Date(), dueAt: null },
        [open],
        "2026-10-21",
      ),
    ).toBe("returned");
  });
});

describe("availability", () => {
  it("subtracts what is on loan and never goes negative", () => {
    expect(availableQuantity(22, 12)).toBe(10);
    expect(availableQuantity(2, 5)).toBe(0);
  });

  it("rejects bulk requests above what is available", () => {
    expect(() =>
      assertBulkAvailable(10, 10, "Cronómetro de mano"),
    ).not.toThrow();
    expect(() => assertBulkAvailable(11, 10, "Cronómetro de mano")).toThrow(
      /Solo hay 10/,
    );
    expect(() => assertBulkAvailable(0, 10, "Cronómetro de mano")).toThrow(
      /Cantidad inválida/,
    );
    expect(() => assertBulkAvailable(1.5, 10, "Cronómetro de mano")).toThrow(
      /Cantidad inválida/,
    );
  });
});

describe("assertItemsLendable", () => {
  const base: LoanCandidateItem = {
    id: 1,
    sku: "SG4-2313",
    guardianUserId: "jaime",
    status: "functional",
    onOpenLoan: false,
    reservedFor: null,
  };

  it("accepts functional or faulty units held by the lender", () => {
    expect(() =>
      assertItemsLendable(
        [base, { ...base, id: 2, status: "faulty" }],
        "jaime",
      ),
    ).not.toThrow();
  });

  it("rejects units held by someone else", () => {
    expect(() => assertItemsLendable([base], "areli")).toThrow(/resguardo/);
  });

  it("rejects lost, retired or in-repair units", () => {
    for (const status of ["lost", "retired", "in_repair"] as const) {
      expect(() => assertItemsLendable([{ ...base, status }], "jaime")).toThrow(
        /no se puede prestar/,
      );
    }
  });

  it("rejects units already on an open loan", () => {
    expect(() =>
      assertItemsLendable([{ ...base, onOpenLoan: true }], "jaime"),
    ).toThrow(/ya está prestado/);
  });

  it("rejects units reserved for a competition", () => {
    expect(() =>
      assertItemsLendable(
        [{ ...base, reservedFor: "Torneo de Rubik Querétaro" }],
        "jaime",
      ),
    ).toThrow("SG4-2313 está reservada para Torneo de Rubik Querétaro");
  });
});

describe("assertItemsConfirmable", () => {
  const base: LoanCandidateItem = {
    id: 1,
    sku: "SG4-2313",
    guardianUserId: "jaime",
    status: "functional",
    onOpenLoan: false,
    reservedFor: null,
  };

  it("accepts free units from any guardian", () => {
    expect(() =>
      assertItemsConfirmable([
        base,
        { ...base, id: 2, guardianUserId: "areli", status: "faulty" },
      ]),
    ).not.toThrow();
  });

  it("rejects units without guardian, unusable, lent or reserved elsewhere", () => {
    expect(() =>
      assertItemsConfirmable([{ ...base, guardianUserId: null }]),
    ).toThrow(/no tiene guardián/);
    expect(() =>
      assertItemsConfirmable([{ ...base, status: "in_repair" }]),
    ).toThrow(/no se puede llevar/);
    expect(() =>
      assertItemsConfirmable([{ ...base, onOpenLoan: true }]),
    ).toThrow(/ya está prestado/);
    expect(() =>
      assertItemsConfirmable([{ ...base, reservedFor: "Nacional 2026" }]),
    ).toThrow(/reservada para Nacional 2026/);
  });
});

describe("pickUnits", () => {
  it("prefers functional units, then lowest SKU", () => {
    const picked = pickUnits(
      [
        { sku: "SG4-2318", status: "functional" as const },
        { sku: "SG4-2313", status: "faulty" as const },
        { sku: "SG4-2315", status: "functional" as const },
      ],
      2,
    );
    expect(picked.map((unit) => unit.sku)).toEqual(["SG4-2315", "SG4-2318"]);
  });
});

function type(
  id: number,
  name: string,
  tracking: EquipmentType["tracking"],
): EquipmentType {
  return {
    id,
    name,
    skuPrefix: name.slice(0, 3).toUpperCase(),
    category: tracking === "serialized" ? "timer" : "accessory",
    tracking,
    sortOrder: id,
    archivedAt: null,
    createdAt: new Date(),
  };
}

const jaime = {
  id: "jaime",
  name: "Jaime Perez",
  wcaId: "2015CARD01",
  image: null,
};
const areli = {
  id: "areli",
  name: "Areli Gordillo",
  wcaId: "2014MART08",
  image: null,
};

function item(
  id: number,
  status: EquipmentItemRow["status"],
  onLoanId: number | null = null,
  guardian = jaime,
): EquipmentItemRow {
  return {
    id,
    sku: `SG4-23${String(id).padStart(2, "0")}`,
    typeId: 1,
    typeName: "Timer SpeedStack G4",
    category: "timer",
    status,
    notes: null,
    guardian,
    source: "AMS",
    onLoanId,
    reservedFor: null,
  };
}

function stock(
  guardian: typeof jaime,
  quantity: number,
  onLoan: number,
  reserved = 0,
): EquipmentStockRow {
  return {
    typeId: 2,
    typeName: "Cronómetro de mano",
    category: "accessory",
    quantity,
    onLoan,
    reserved,
    notes: null,
    guardian,
  };
}

describe("summarizeInventory", () => {
  const types = [
    type(1, "Timer SpeedStack G4", "serialized"),
    type(2, "Cronómetro de mano", "bulk"),
  ];

  it("counts serialized units by status and loan, excluding lost and retired from the total", () => {
    const [timers] = summarizeInventory(
      types,
      [
        item(1, "functional"),
        item(2, "functional", 7),
        item(3, "faulty"),
        item(4, "in_repair"),
        item(5, "lost"),
        item(6, "retired"),
      ],
      [],
    );
    expect(timers).toMatchObject({
      total: 4,
      available: 2,
      onLoan: 1,
      faulty: 1,
      inRepair: 1,
      lost: 1,
    });
  });

  it("adds bulk stock across guardians", () => {
    const [, stopwatches] = summarizeInventory(
      types,
      [],
      [stock(jaime, 22, 12), stock(areli, 74, 0)],
    );
    expect(stopwatches).toMatchObject({ total: 96, onLoan: 12, available: 84 });
  });

  it("keeps reserved equipment in the total but out of what is available", () => {
    const [timers, stopwatches] = summarizeInventory(
      types,
      [
        item(1, "functional"),
        {
          ...item(2, "functional"),
          reservedFor: { competitionId: 4, name: "Nacional" },
        },
      ],
      [stock(jaime, 22, 2, 8)],
    );
    expect(timers).toMatchObject({ total: 2, available: 1, reserved: 1 });
    expect(stopwatches).toMatchObject({
      total: 22,
      onLoan: 2,
      reserved: 8,
      available: 12,
    });
  });
});

describe("groupByGuardian", () => {
  it("groups units and stock per guardian, sorted by name", () => {
    const groups = groupByGuardian(
      [item(1, "functional"), item(2, "functional", null, areli)],
      [stock(jaime, 22, 0)],
    );
    expect(groups.map((g) => g.guardian.id)).toEqual(["areli", "jaime"]);
    expect(groups[1]!.items).toHaveLength(1);
    expect(groups[1]!.stock).toHaveLength(1);
  });
});

describe("normalizeRequestLines", () => {
  it("drops empty rows and keeps the rest", () => {
    expect(
      normalizeRequestLines([
        { typeId: 1, quantity: 8 },
        { typeId: 2, quantity: 0 },
        { typeId: 3, quantity: 12 },
      ]),
    ).toEqual([
      { typeId: 1, quantity: 8 },
      { typeId: 3, quantity: 12 },
    ]);
  });

  it("rejects invalid quantities and repeated types", () => {
    expect(() => normalizeRequestLines([{ typeId: 1, quantity: 1.5 }])).toThrow(
      EquipmentError,
    );
    expect(() => normalizeRequestLines([{ typeId: 1, quantity: -2 }])).toThrow(
      EquipmentError,
    );
    expect(() =>
      normalizeRequestLines([{ typeId: 1, quantity: 5000 }]),
    ).toThrow(EquipmentError);
    expect(() =>
      normalizeRequestLines([
        { typeId: 1, quantity: 2 },
        { typeId: 1, quantity: 3 },
      ]),
    ).toThrow("aparece dos veces");
  });
});

describe("nextRequestStatus", () => {
  it("starts as draft unless organizers submit", () => {
    expect(nextRequestStatus(null, false)).toBe("draft");
    expect(nextRequestStatus(null, true)).toBe("submitted");
    expect(nextRequestStatus("draft", true)).toBe("submitted");
  });

  it("keeps a submitted request submitted when edited", () => {
    expect(nextRequestStatus("submitted", false)).toBe("submitted");
  });

  it("reopens a cancelled request", () => {
    expect(nextRequestStatus("cancelled", false)).toBe("draft");
    expect(nextRequestStatus("cancelled", true)).toBe("submitted");
  });

  it("locks the request once the delegate confirms the equipment", () => {
    expect(() => nextRequestStatus("fulfilled", false)).toThrow(
      "ya confirmó el equipo",
    );
  });
});

describe("assertRequestConfirmable", () => {
  const today = "2026-10-22";

  it("accepts sent or already confirmed requests of upcoming competitions", () => {
    for (const status of ["submitted", "fulfilled"] as const) {
      expect(() =>
        assertRequestConfirmable(
          { status, competitionEndDate: "2026-10-22" },
          today,
        ),
      ).not.toThrow();
    }
  });

  it("rejects drafts, cancelled requests and finished competitions", () => {
    expect(() =>
      assertRequestConfirmable(
        { status: "draft", competitionEndDate: "2026-12-01" },
        today,
      ),
    ).toThrow(/aún no envían/);
    expect(() =>
      assertRequestConfirmable(
        { status: "cancelled", competitionEndDate: "2026-12-01" },
        today,
      ),
    ).toThrow("cancelada");
    expect(() =>
      assertRequestConfirmable(
        { status: "submitted", competitionEndDate: "2026-10-21" },
        today,
      ),
    ).toThrow("ya terminó");
  });
});

describe("isReservationActive", () => {
  const today = "2026-10-22";

  it("blocks units from confirmation through the competition's last day", () => {
    expect(
      isReservationActive(
        { status: "fulfilled", competitionEndDate: "2026-10-22" },
        today,
      ),
    ).toBe(true);
  });

  it("frees units after the competition or when the request isn't confirmed", () => {
    expect(
      isReservationActive(
        { status: "fulfilled", competitionEndDate: "2026-10-21" },
        today,
      ),
    ).toBe(false);
    for (const status of ["draft", "submitted", "cancelled"] as const) {
      expect(
        isReservationActive(
          { status, competitionEndDate: "2026-12-01" },
          today,
        ),
      ).toBe(false);
    }
  });
});
