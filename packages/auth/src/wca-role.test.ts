import { describe, expect, it } from "vitest";

import { resolveWcaRole } from "./wca-role";

describe("resolveWcaRole", () => {
  it("promotes when WCA reports a delegate status for a new user", () => {
    expect(
      resolveWcaRole({
        delegateStatus: "delegate",
        existingRole: undefined,
      }),
    ).toBe("delegate");
  });

  it("promotes an existing user when WCA reports a delegate status", () => {
    expect(
      resolveWcaRole({
        delegateStatus: "candidate_delegate",
        existingRole: "user",
      }),
    ).toBe("delegate");
  });

  it("preserves an existing AMS delegate when WCA status is null", () => {
    expect(
      resolveWcaRole({
        delegateStatus: null,
        existingRole: "delegate",
      }),
    ).toBe("delegate");
  });

  it("preserves an existing AMS editor when WCA status is null", () => {
    expect(
      resolveWcaRole({
        delegateStatus: null,
        existingRole: "editor",
      }),
    ).toBe("editor");
  });

  it("promotes an editor to delegate when WCA reports a delegate status", () => {
    expect(
      resolveWcaRole({
        delegateStatus: "delegate",
        existingRole: "editor",
      }),
    ).toBe("delegate");
  });

  it("keeps a regular user when WCA status is null", () => {
    expect(
      resolveWcaRole({
        delegateStatus: null,
        existingRole: "user",
      }),
    ).toBe("user");
  });

  it("defaults to user when there is no WCA status and no existing row", () => {
    expect(
      resolveWcaRole({
        delegateStatus: undefined,
        existingRole: undefined,
      }),
    ).toBe("user");
  });
});
