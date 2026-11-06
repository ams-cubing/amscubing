import { describe, expect, it } from "vitest";

import { commentRecipients } from "@/lib/comment-recipients";

const team = [{ id: "organizer" }, { id: "delegate" }, { id: "member" }];

describe("commentRecipients", () => {
  it("notifies the whole team except the author", () => {
    expect(
      commentRecipients({
        team,
        cardMemberIds: [],
        mentionedIds: new Set(),
        actorId: "delegate",
      }),
    ).toEqual(["organizer", "member"]);
  });

  it("skips users who already get a mention notification", () => {
    expect(
      commentRecipients({
        team,
        cardMemberIds: [],
        mentionedIds: new Set(["organizer"]),
        actorId: "delegate",
      }),
    ).toEqual(["member"]);
  });

  it("includes card assignees outside the team without duplicates", () => {
    expect(
      commentRecipients({
        team,
        cardMemberIds: ["member", "former-member"],
        mentionedIds: new Set(),
        actorId: "organizer",
      }),
    ).toEqual(["delegate", "member", "former-member"]);
  });

  it("returns nobody when the author is alone", () => {
    expect(
      commentRecipients({
        team: [{ id: "solo" }],
        cardMemberIds: ["solo"],
        mentionedIds: new Set(),
        actorId: "solo",
      }),
    ).toEqual([]);
  });
});
