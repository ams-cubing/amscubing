import { describe, expect, it } from "vitest";

import {
  countPayingCompetitors,
  FREE_ENTRY_WCIF_ROLES,
} from "./wca-registration-revenue";

describe("countPayingCompetitors", () => {
  it("counts accepted competing people and excludes staff roles", () => {
    const counts = countPayingCompetitors([
      {
        name: "Delegate",
        roles: ["delegate"],
        registration: { status: "accepted", isCompeting: true },
      },
      {
        name: "Trainee",
        roles: ["trainee-delegate"],
        registration: { status: "accepted", isCompeting: true },
      },
      {
        name: "Organizer",
        roles: ["organizer"],
        registration: { status: "accepted", isCompeting: true },
      },
      {
        name: "Competitor",
        roles: [],
        registration: { status: "accepted", isCompeting: true },
      },
      {
        name: "Pending",
        roles: [],
        registration: { status: "pending", isCompeting: true },
      },
      {
        name: "Not competing",
        roles: [],
        registration: { status: "accepted", isCompeting: false },
      },
    ]);

    expect(counts).toEqual({
      acceptedCompeting: 4,
      excludedStaff: 3,
      payingCompetitors: 1,
    });
  });

  it("treats missing isCompeting as competing", () => {
    expect(
      countPayingCompetitors([
        {
          roles: [],
          registration: { status: "accepted" },
        },
      ]).payingCompetitors,
    ).toBe(1);
  });
});

describe("FREE_ENTRY_WCIF_ROLES", () => {
  it("covers delegate, trainee-delegate and organizer", () => {
    expect(FREE_ENTRY_WCIF_ROLES.has("delegate")).toBe(true);
    expect(FREE_ENTRY_WCIF_ROLES.has("trainee-delegate")).toBe(true);
    expect(FREE_ENTRY_WCIF_ROLES.has("organizer")).toBe(true);
  });
});
