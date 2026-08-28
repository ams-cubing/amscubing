import { describe, expect, it } from "vitest";

import {
  parseMentions,
  resolveMentionedUsers,
  segmentCommentBody,
} from "./mentions";

describe("parseMentions", () => {
  it("extracts unique WCA IDs", () => {
    expect(parseMentions("Hola @2016TORO03 y @2016TORO03")).toEqual([
      "2016TORO03",
    ]);
  });

  it("returns empty for no mentions", () => {
    expect(parseMentions("Sin menciones")).toEqual([]);
  });
});

describe("resolveMentionedUsers", () => {
  const team = [
    { userId: "1", wcaId: "2016TORO03", name: "Leo" },
    { userId: "2", wcaId: "2017ABCD01", name: "Ana" },
  ];

  it("resolves known team members", () => {
    expect(resolveMentionedUsers(["2016TORO03", "2017ABCD01"], team)).toEqual(
      team,
    );
  });

  it("ignores unknown WCA IDs", () => {
    expect(resolveMentionedUsers(["9999XXXX01"], team)).toEqual([]);
  });
});

describe("segmentCommentBody", () => {
  it("segments text and mentions", () => {
    expect(
      segmentCommentBody("Hola @2016TORO03 revisa esto", [
        { userId: "1", wcaId: "2016TORO03", name: "Leo" },
      ]),
    ).toEqual([
      { type: "text", value: "Hola " },
      { type: "mention", wcaId: "2016TORO03", name: "Leo" },
      { type: "text", value: " revisa esto" },
    ]);
  });
});
