import { describe, expect, it } from "vitest";

import { blocksNewDateRequest } from "./pending-competition";

const today = "2026-11-05";
const pending = {
  statusPublic: "confirmed",
  statusInternal: "venue_found",
  endDate: "2026-12-01",
};

describe("blocksNewDateRequest", () => {
  it("blocks while an unannounced competition is still active", () => {
    expect(blocksNewDateRequest(pending, today)).toBe(true);
    expect(blocksNewDateRequest({ ...pending, endDate: today }, today)).toBe(
      true,
    );
  });

  it("ignores cancelled or finished competitions", () => {
    expect(
      blocksNewDateRequest({ ...pending, statusInternal: "cancelled" }, today),
    ).toBe(false);
    expect(
      blocksNewDateRequest({ ...pending, statusInternal: "celebrated" }, today),
    ).toBe(false);
  });

  it("ignores competitions that already ended", () => {
    expect(
      blocksNewDateRequest({ ...pending, endDate: "2026-05-02" }, today),
    ).toBe(false);
  });

  it("ignores announced or suspended competitions", () => {
    expect(
      blocksNewDateRequest({ ...pending, statusPublic: "announced" }, today),
    ).toBe(false);
    expect(
      blocksNewDateRequest({ ...pending, statusPublic: "suspended" }, today),
    ).toBe(false);
  });
});
