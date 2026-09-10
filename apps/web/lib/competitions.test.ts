import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

import {
  deriveRegistrationLabel,
  getCompetitionSpotlights,
  type PublicCompetition,
} from "@/lib/competitions";

function competition(
  overrides: Partial<PublicCompetition> &
    Pick<PublicCompetition, "id" | "startDate" | "endDate">,
): PublicCompetition {
  return {
    name: "Comp",
    city: "CDMX",
    state: "Ciudad de México",
    capacity: 100,
    registered: null,
    registrationOpen: null,
    registrationClose: null,
    wcaCompetitionUrl: "https://www.worldcubeassociation.org/competitions/Test",
    image: "/source/photos/ponny-3.jpg",
    label: "Próximamente",
    ...overrides,
  };
}

describe("deriveRegistrationLabel", () => {
  it("returns Lleno when registration is full", () => {
    expect(
      deriveRegistrationLabel(
        "2020-01-01T00:00:00Z",
        "2099-01-01T00:00:00Z",
        0,
        true,
      ),
    ).toBe("Lleno");
  });

  it("returns Próximamente when dates are missing", () => {
    expect(deriveRegistrationLabel(null, null)).toBe("Próximamente");
  });

  it("returns Inscripciones abiertas when now is inside the window", () => {
    expect(
      deriveRegistrationLabel("2020-01-01T00:00:00Z", "2099-01-01T00:00:00Z"),
    ).toBe("Inscripciones abiertas");
  });

  it("returns Cerrado when the window ended", () => {
    expect(
      deriveRegistrationLabel("2020-01-01T00:00:00Z", "2020-02-01T00:00:00Z"),
    ).toBe("Cerrado");
  });
});

describe("getCompetitionSpotlights", () => {
  it("returns ongoing competitions when any are in progress", () => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const spotlights = getCompetitionSpotlights([
      competition({
        id: "Ongoing",
        name: "Ongoing Open",
        startDate: today,
        endDate: today,
      }),
      competition({
        id: "Future",
        name: "Future Open",
        startDate: "2099-01-01",
        endDate: "2099-01-02",
      }),
    ]);

    expect(spotlights).toEqual([
      expect.objectContaining({
        id: "Ongoing",
        status: "En curso",
        url: "https://live.worldcubeassociation.org/competitions/Ongoing",
      }),
    ]);
  });

  it("returns the next upcoming competition when none are ongoing", () => {
    const spotlights = getCompetitionSpotlights([
      competition({
        id: "Later",
        startDate: "2099-06-01",
        endDate: "2099-06-02",
      }),
      competition({
        id: "Soon",
        startDate: "2099-01-01",
        endDate: "2099-01-02",
      }),
    ]);

    expect(spotlights).toEqual([
      expect.objectContaining({
        id: "Soon",
        status: "Próximo",
      }),
    ]);
  });
});
