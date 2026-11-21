import { describe, expect, it } from "vitest";

import {
  checkInRowsFromWcif,
  checkInRowsToCsv,
} from "./wca-authenticated-wcif";

describe("checkInRowsFromWcif", () => {
  it("builds sorted check-in rows from accepted competitors", () => {
    const rows = checkInRowsFromWcif([
      {
        name: "Zoe",
        wcaId: "2010ZOE01",
        registrantId: 2,
        birthdate: "2000-01-01",
        gender: "f",
        countryIso2: "mx",
        registration: {
          status: "accepted",
          isCompeting: true,
          eventIds: ["333", "222"],
        },
      },
      {
        name: "Ana",
        wcaId: null,
        registrantId: 1,
        birthdate: "2012-05-05",
        gender: "f",
        countryIso2: "MX",
        registration: {
          status: "accepted",
          eventIds: ["333"],
        },
      },
      {
        name: "Skip",
        registration: { status: "accepted", isCompeting: false },
      },
    ]);

    expect(rows.map((row) => row.name)).toEqual(["Ana", "Zoe"]);
    expect(rows[0]).toMatchObject({
      isNew: true,
      wcaId: null,
      countryIso2: "MX",
      eventIds: ["333"],
    });
  });
});

describe("checkInRowsToCsv", () => {
  it("emits a BOM and empty check columns", () => {
    const csv = checkInRowsToCsv([
      {
        registrantId: 1,
        name: 'Ana "Nueva"',
        wcaId: null,
        isNew: true,
        birthdate: "2012-05-05",
        gender: "f",
        countryIso2: "MX",
        eventIds: ["333", "222"],
      },
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(
      "asistio,kit_gafete,datos_verificados,registrant_id,nombre",
    );
    expect(csv).toContain(',1,"Ana ""Nueva""",,si,2012-05-05,f,MX,"333,222"');
  });
});
