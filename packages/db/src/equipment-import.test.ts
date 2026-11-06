import { describe, expect, it } from "vitest";

import {
  inferAcquisitionKind,
  inferSource,
  parseCsv,
  parseLooseDate,
  parseQuantity,
  parseStatus,
  parseTracking,
} from "./equipment-import";

describe("parseCsv", () => {
  it("reads headers case-insensitively and handles quotes, commas and newlines", () => {
    const rows = parseCsv(
      '\uFEFFSKU,Notes\r\nDS3-2318,"A veces hace falso, revisar"\nDS3-2315,"No reconoce\nla electricidad"\n\n',
    );
    expect(rows).toEqual([
      { sku: "DS3-2318", notes: "A veces hace falso, revisar" },
      { sku: "DS3-2315", notes: "No reconoce\nla electricidad" },
    ]);
  });

  it("unescapes doubled quotes and fills missing cells", () => {
    expect(parseCsv('a,b\n"di ""hola"""\n')).toEqual([
      { a: 'di "hola"', b: "" },
    ]);
  });
});

describe("parseStatus / parseTracking", () => {
  it("accepts the sheet's Spanish labels", () => {
    expect(parseStatus("Funcional")).toBe("functional");
    expect(parseStatus("Defectuoso")).toBe("faulty");
    expect(parseStatus("En reparación")).toBe("in_repair");
    expect(parseStatus("")).toBe("functional");
    expect(() => parseStatus("roto")).toThrow(/Estado desconocido/);
    expect(parseTracking("por cantidad")).toBe("bulk");
    expect(parseTracking("serialized")).toBe("serialized");
  });
});

describe("parseLooseDate", () => {
  it("normalizes the history table's date formats", () => {
    expect(parseLooseDate("2023-02-15")).toBe("2023-02-15");
    expect(parseLooseDate("2023-06")).toBe("2023-06-01");
    expect(parseLooseDate("2018")).toBe("2018-01-01");
    expect(parseLooseDate("2014-2015")).toBe("2014-01-01");
    expect(parseLooseDate("febrero-2023")).toBe("2023-02-01");
    expect(parseLooseDate("Diciembre 2023")).toBe("2023-12-01");
    expect(() => parseLooseDate("pronto")).toThrow(/Fecha no reconocida/);
  });
});

describe("inference", () => {
  it("guesses kind and source from descriptions", () => {
    expect(inferAcquisitionKind("Se vendieron timers 7 timers g3.", -7)).toBe(
      "sale",
    );
    expect(inferAcquisitionKind("WCA dona 20 timers g5", 40)).toBe("donation");
    expect(inferAcquisitionKind("Se compraron 20 timers G5", 25)).toBe(
      "purchase",
    );
    expect(inferSource("WCA dona 2 displays")).toBe("WCA");
    expect(inferSource("Se compraron 20 timers G5")).toBe("AMS");
  });

  it("parses signed quantities and blanks", () => {
    expect(parseQuantity("-7", "SG3")).toBe(-7);
    expect(parseQuantity("+10", "SG4")).toBe(10);
    expect(parseQuantity("", "SG4")).toBe(0);
    expect(() => parseQuantity("diez", "SG4")).toThrow(/Cantidad inválida/);
  });
});
