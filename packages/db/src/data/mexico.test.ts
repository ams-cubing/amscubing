import { describe, expect, it } from "vitest";

import {
  displayCityFromWcaCity,
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
    expect(resolveMexicoStateFromWcaCity("Tijuana")).toBe("BCN");
    expect(resolveMexicoStateFromWcaCity("Mexicali")).toBe("BCN");
    expect(resolveMexicoStateFromWcaCity("Monterrey")).toBe("NLE");
    expect(resolveMexicoStateFromWcaCity("Ahome, Los Mochis")).toBe("SIN");
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

describe("displayCityFromWcaCity", () => {
  it("keeps the city and drops the comma state segment", () => {
    expect(displayCityFromWcaCity("Tepic, Nayarit")).toBe("Tepic");
    expect(
      displayCityFromWcaCity("Chiconcuac, Estado de México, Mexico"),
    ).toBe("Chiconcuac");
  });

  it("pops an embedded state name when there is no comma", () => {
    expect(displayCityFromWcaCity("Tepic Nayarit")).toBe("Tepic");
  });

  it("keeps a city that shares its name with the state", () => {
    expect(displayCityFromWcaCity("Puebla, Puebla, Mexico")).toBe("Puebla");
  });

  it("returns null for empty input", () => {
    expect(displayCityFromWcaCity(null)).toBeNull();
    expect(displayCityFromWcaCity("   ")).toBeNull();
  });
});
