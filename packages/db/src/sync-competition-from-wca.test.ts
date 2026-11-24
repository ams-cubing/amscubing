import { describe, expect, it } from "vitest";

import { buildCompetitionPatchFromWca } from "./sync-competition-from-wca";

const baseRow = {
  name: "Local Name",
  city: "Local City",
  stateId: "JAL",
  startDate: "2026-01-01",
  endDate: "2026-01-02",
  capacity: 40,
  mainEventId: "333",
  wcaCompetitionUrl:
    "https://www.worldcubeassociation.org/competitions/Example2026",
  statusPublic: "announced",
};

describe("buildCompetitionPatchFromWca", () => {
  it("builds a patch for differing WCA fields", () => {
    const patch = buildCompetitionPatchFromWca(baseRow, {
      name: "Enguasados en Nayarit 2026",
      shortName: "Enguasados en Nayarit 2026",
      city: "Tepic, Nayarit",
      startDate: "2026-12-12",
      endDate: "2026-12-13",
      competitorLimit: 50,
      mainEventId: "333oh",
    });

    expect(patch).toEqual({
      name: "Enguasados en Nayarit 2026",
      city: "Tepic",
      stateId: "NAY",
      startDate: "2026-12-12",
      endDate: "2026-12-13",
      capacity: 50,
      mainEventId: "333oh",
    });
  });

  it("returns an empty patch when nothing differs", () => {
    const patch = buildCompetitionPatchFromWca(
      {
        ...baseRow,
        name: "Same",
        city: "Tepic",
        stateId: "NAY",
        startDate: "2026-12-12",
        endDate: "2026-12-13",
        capacity: 50,
        mainEventId: "333",
      },
      {
        name: "Same",
        shortName: null,
        city: "Tepic, Nayarit",
        startDate: "2026-12-12",
        endDate: "2026-12-13",
        competitorLimit: 50,
        mainEventId: "333",
      },
    );

    expect(patch).toEqual({});
  });

  it("ignores city/state when the WCA city cannot be resolved", () => {
    const patch = buildCompetitionPatchFromWca(baseRow, {
      name: null,
      shortName: null,
      city: "Somewhere, Nowhere",
      startDate: null,
      endDate: null,
      competitorLimit: null,
      mainEventId: null,
    });

    expect(patch).toEqual({});
  });

  it("falls back to short_name when name is missing", () => {
    const patch = buildCompetitionPatchFromWca(baseRow, {
      name: null,
      shortName: "Short Name 2026",
      city: null,
      startDate: null,
      endDate: null,
      competitorLimit: null,
      mainEventId: null,
    });

    expect(patch).toEqual({ name: "Short Name 2026" });
  });
});
