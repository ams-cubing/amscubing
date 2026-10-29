import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  createEquipmentSheetPdf,
  equipmentSheetFolio,
  equipmentSheetRows,
  type EquipmentSheetInput,
} from "./equipment-sheet";
import { LETTER } from "./letterhead";

function sheet(
  overrides: Partial<EquipmentSheetInput> = {},
): EquipmentSheetInput {
  return {
    competition: {
      id: 7,
      name: "Torneo de Rubik Querétaro 2026",
      city: "Querétaro",
      stateName: "Querétaro",
      startDate: "2026-12-12",
      endDate: "2026-12-13",
    },
    primaryDelegate: { name: "Leonardo Sánchez", wcaId: "2015SANC18" },
    primaryOrganizer: { name: "María Peña", wcaId: null },
    request: {
      id: 3,
      status: "submitted",
      notes: "Necesitamos llegar el viernes para montar.",
      lines: [
        { typeName: "Timer SpeedStack G4", quantity: 8 },
        { typeName: "Display SpeedStack G3", quantity: 8 },
      ],
    },
    confirmation: null,
    ...overrides,
  };
}

const confirmation = (
  count: number,
): NonNullable<EquipmentSheetInput["confirmation"]> => ({
  lines: [
    ...Array.from({ length: count }, (_, i) => ({
      typeName: "Timer SpeedStack G4",
      sku: `SG4-23${String(i + 1).padStart(2, "0")}`,
      quantity: 1,
      guardian: { name: "Leonardo Sánchez" },
    })),
    {
      typeName: "Cronómetro de mano",
      sku: null,
      quantity: 12,
      guardian: { name: "Areli Gordillo" },
    },
  ],
});

describe("equipmentSheetRows", () => {
  it("lists nothing until the delegate confirms", () => {
    expect(equipmentSheetRows(sheet())).toEqual([]);
  });

  it("lists the confirmed SKUs and who brings them", () => {
    const rows = equipmentSheetRows(sheet({ confirmation: confirmation(2) }));
    expect(rows.map((row) => [row.identifier, row.carrier])).toEqual([
      ["SG4-2301", "Leonardo Sánchez"],
      ["SG4-2302", "Leonardo Sánchez"],
      ["12 pzas.", "Areli Gordillo"],
    ]);
  });
});

describe("equipmentSheetFolio", () => {
  it("uses the request id, or the competition when there is none", () => {
    expect(equipmentSheetFolio(sheet())).toBe("EQ-3");
    expect(equipmentSheetFolio(sheet({ request: null }))).toBe("EQ-C7");
  });
});

describe("createEquipmentSheetPdf", () => {
  it("renders a Letter-size PDF", async () => {
    const bytes = await createEquipmentSheetPdf(sheet());
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect([width, height]).toEqual([LETTER.width, LETTER.height]);
    expect(pdf.getTitle()).toContain("Torneo de Rubik Querétaro 2026");
  });

  it("paginates long lists and keeps the letterhead on every page", async () => {
    const bytes = await createEquipmentSheetPdf(
      sheet({ confirmation: confirmation(60) }),
    );
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(2);
    for (const page of pdf.getPages()) {
      expect(page.getSize()).toEqual(LETTER);
      expect(page.node.Resources()?.toString()).toContain("XObject");
    }
  });

  it("survives names outside the standard font encoding", async () => {
    const bytes = await createEquipmentSheetPdf(
      sheet({ primaryOrganizer: { name: "Łukasz 王 Nowak", wcaId: null } }),
    );
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });
});
