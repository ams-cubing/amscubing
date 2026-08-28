import { describe, expect, it } from "vitest";

import {
  parseMentions,
  resolveAllMentionedUsers,
  resolveMentionedUsers,
  segmentCommentBody,
} from "./mentions";

describe("parseMentions", () => {
  it("extracts unique WCA IDs", () => {
    expect(parseMentions("Hola @2016TORO03 y @2016TORO03")).toEqual({
      userWcaIds: ["2016TORO03"],
      groups: [],
    });
  });

  it("extracts group mentions", () => {
    expect(parseMentions("Hola @organizadores y @delegados")).toEqual({
      userWcaIds: [],
      groups: ["organizers", "delegates"],
    });
  });

  it("accepts English group aliases", () => {
    expect(parseMentions("@organizers @delegates @all")).toEqual({
      userWcaIds: [],
      groups: ["organizers", "delegates", "all"],
    });
  });

  it("returns empty for no mentions", () => {
    expect(parseMentions("Sin menciones")).toEqual({
      userWcaIds: [],
      groups: [],
    });
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

describe("resolveAllMentionedUsers", () => {
  const roleGroups = {
    all: [
      { userId: "1", wcaId: "2016TORO03", name: "Leo" },
      { userId: "2", wcaId: "2017ABCD01", name: "Ana" },
      { userId: "3", wcaId: "2018WXYZ01", name: "Luis" },
    ],
    organizers: [
      { userId: "1", wcaId: "2016TORO03", name: "Leo" },
      { userId: "2", wcaId: "2017ABCD01", name: "Ana" },
    ],
    delegates: [{ userId: "3", wcaId: "2018WXYZ01", name: "Luis" }],
  };

  it("expands group mentions", () => {
    expect(
      resolveAllMentionedUsers(
        { userWcaIds: [], groups: ["organizers"] },
        roleGroups,
      ),
    ).toEqual(roleGroups.organizers);
  });

  it("deduplicates users across group and individual mentions", () => {
    expect(
      resolveAllMentionedUsers(
        { userWcaIds: ["2016TORO03"], groups: ["organizers"] },
        roleGroups,
      ),
    ).toEqual(roleGroups.organizers);
  });

  it("mentions everyone with @todos", () => {
    expect(
      resolveAllMentionedUsers(
        { userWcaIds: [], groups: ["all"] },
        roleGroups,
      ),
    ).toEqual(roleGroups.all);
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

  it("segments group mentions", () => {
    expect(segmentCommentBody("Hola @organizadores", [])).toEqual([
      { type: "text", value: "Hola " },
      {
        type: "groupMention",
        kind: "organizers",
        label: "Organizadores",
      },
    ]);
  });
});
