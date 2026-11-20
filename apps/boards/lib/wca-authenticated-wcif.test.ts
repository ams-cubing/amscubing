import { describe, expect, it } from "vitest";

import { competitorRecipientsFromWcif } from "./wca-authenticated-wcif";

describe("competitorRecipientsFromWcif", () => {
  it("keeps accepted competing people with deliverable email", () => {
    const recipients = competitorRecipientsFromWcif([
      {
        name: "Ana",
        email: "ana@example.com",
        registration: { status: "accepted", isCompeting: true },
      },
      {
        name: "Bob",
        email: "bob@example.com",
        registration: { status: "accepted" },
      },
      {
        name: "Skip",
        email: "skip@example.com",
        registration: { status: "accepted", isCompeting: false },
      },
      {
        name: "Pending",
        email: "pending@example.com",
        registration: { status: "pending", isCompeting: true },
      },
      {
        name: "Stub",
        email: "2016TEST01@ams.placeholder",
        registration: { status: "accepted", isCompeting: true },
      },
      {
        name: "Dup",
        email: "ANA@example.com",
        registration: { status: "accepted", isCompeting: true },
      },
    ]);

    expect(recipients).toEqual([
      { name: "Ana", email: "ana@example.com" },
      { name: "Bob", email: "bob@example.com" },
    ]);
  });
});
