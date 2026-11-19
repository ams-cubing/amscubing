import { describe, expect, it } from "vitest";

import {
  regionIdForState,
  resolveMexicoRegionFromWcaCity,
  resolveMexicoStateFromWcaCity,
} from "./mexico";

describe("resolveMexicoStateFromWcaCity", () => {
  it("parses common WCA city strings", () => {
    expect(
      resolveMexicoStateFromWcaCity("Chiconcuac, Estado de México, Mexico"),
    ).toBe("MEX");
    expect(
      resolveMexicoStateFromWcaCity("Monterrey, Nuevo León, Mexico"),
    ).toBe("NLE");
    expect(
      resolveMexicoStateFromWcaCity("Guadalajara, Jalisco, Mexico"),
    ).toBe("JAL");
    expect(
      resolveMexicoStateFromWcaCity("Mexico City, Ciudad de México, Mexico"),
    ).toBe("CMX");
    expect(resolveMexicoStateFromWcaCity("Tijuana, Baja California, Mexico")).toBe(
      "BCN",
    );
  });

  it("maps state to AMS region", () => {
    expect(regionIdForState("MEX")).toBe("centro");
    expect(regionIdForState("JAL")).toBe("occidente");
    expect(resolveMexicoRegionFromWcaCity("Puebla, Puebla, Mexico")).toBe(
      "oriente",
    );
  });

  it("returns null for unknown places", () => {
    expect(resolveMexicoStateFromWcaCity("Somewhere, Nowhere")).toBeNull();
    expect(resolveMexicoStateFromWcaCity(null)).toBeNull();
  });
});
