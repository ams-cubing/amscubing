import { describe, expect, it } from "vitest";

import { DELEGATES_BOARD_NAME, isDelegatesBoard } from "./delegates-board";
import {
  convertTrelloComment,
  dateFromTrelloId,
  matchTrelloMembersByName,
  planTrelloImport,
  type TrelloExport,
} from "./trello-import";

const carlos = {
  id: "u-carlos",
  name: "Carlos Ricardo Chin Dzul",
  wcaId: "2014DZUL02",
};
const rocio = {
  id: "u-rocio",
  name: "Rocio Rodriguez Rivera",
  wcaId: "2016RIVE14",
};
const leo = {
  id: "u-leo",
  name: "Leonardo Sánchez Del Toro",
  wcaId: "2016TORO03",
};

function trelloExport(overrides: Partial<TrelloExport> = {}): TrelloExport {
  return {
    name: "Pendientes",
    lists: [
      { id: "l2", name: "En proceso", closed: false, pos: 2 },
      { id: "l1", name: "Por hacer", closed: false, pos: 1 },
      { id: "l3", name: "Vieja", closed: true, pos: 3 },
    ],
    labels: [
      { id: "lb1", name: "Constitución", color: "green_dark" },
      { id: "lb2", name: "", color: "orange" },
    ],
    cards: [
      {
        id: "65e00451642e4debfb59b026",
        name: "Banco AMS ",
        desc: "",
        closed: false,
        idList: "l1",
        pos: 5,
        due: "2026-03-12T18:00:00.000Z",
        idLabels: ["lb1", "lb2"],
        idMembers: ["m-carlos", "m-ben"],
        shortUrl: "https://trello.com/c/abc",
        attachments: [
          {
            name: "logo.png",
            url: "https://trello.com/1/x/logo.png",
            isUpload: true,
          },
          { name: "Doc", url: "https://docs.google.com/d/1", isUpload: false },
        ],
      },
      {
        id: "65e00451642e4debfb59b027",
        name: "Archivada",
        desc: "",
        closed: true,
        idList: "l1",
        pos: 1,
        due: null,
        idLabels: [],
        idMembers: [],
        shortUrl: "https://trello.com/c/def",
        attachments: [],
      },
    ],
    checklists: [
      {
        id: "c1",
        idCard: "65e00451642e4debfb59b026",
        name: "Pasos",
        pos: 1,
        checkItems: [
          { name: "Segundo", pos: 2, state: "incomplete" },
          { name: "Primero", pos: 1, state: "complete" },
        ],
      },
    ],
    members: [
      { id: "m-carlos", fullName: "Carlos Chin", username: "carloschin" },
      {
        id: "m-rocio",
        fullName: "Rocio Rodriguez",
        username: "rociorodriguez27",
      },
      {
        id: "m-ben",
        fullName: "Benjamín Sánchez Magaña",
        username: "benjamin",
      },
      { id: "m-aru", fullName: "Aru", username: "123xaru" },
    ],
    actions: [
      {
        type: "commentCard",
        date: "2026-03-02T00:00:00.000Z",
        idMemberCreator: "m-ben",
        data: { text: "Ya quedó", card: { id: "65e00451642e4debfb59b026" } },
      },
      {
        type: "commentCard",
        date: "2026-03-01T00:00:00.000Z",
        idMemberCreator: "m-carlos",
        data: {
          text: "@rociorodriguez27 revisa esto",
          card: { id: "65e00451642e4debfb59b026" },
        },
      },
      {
        type: "commentCard",
        date: "2026-03-03T00:00:00.000Z",
        idMemberCreator: "m-carlos",
        data: {
          text: "@card esta tarea llegará a su fecha límite en 2 días.",
          card: { id: "65e00451642e4debfb59b026" },
        },
      },
    ],
    ...overrides,
  };
}

describe("isDelegatesBoard", () => {
  it("only matches the reserved name on a blank, non-template board", () => {
    const base = {
      name: DELEGATES_BOARD_NAME,
      isTemplate: false,
      competitionId: null,
    };
    expect(isDelegatesBoard(base)).toBe(true);
    expect(
      isDelegatesBoard({ ...base, name: " pendientes de DELEGADOS " }),
    ).toBe(true);
    expect(isDelegatesBoard({ ...base, isTemplate: true })).toBe(false);
    expect(isDelegatesBoard({ ...base, competitionId: 4 })).toBe(false);
    expect(isDelegatesBoard({ ...base, name: "Otro" })).toBe(false);
  });
});

describe("matchTrelloMembersByName", () => {
  it("matches when every word of the Trello name is in exactly one user name", () => {
    const matched = matchTrelloMembersByName(trelloExport().members, [
      carlos,
      rocio,
      leo,
    ]);
    expect(matched.get("m-carlos")).toBe(carlos);
    expect(matched.get("m-rocio")).toBe(rocio);
    expect(matched.has("m-ben")).toBe(false);
    expect(matched.has("m-aru")).toBe(false);
  });

  it("ignores accents and skips ambiguous matches", () => {
    const members = [
      { id: "m-leo", fullName: "Leonardo Del Toro", username: "leo" },
    ];
    expect(matchTrelloMembersByName(members, [leo]).get("m-leo")).toBe(leo);
    expect(
      matchTrelloMembersByName(members, [
        leo,
        { id: "u2", name: "Leonardo Del Toro Ruiz", wcaId: null },
      ]).size,
    ).toBe(0);
  });
});

describe("convertTrelloComment", () => {
  it("rewrites known usernames to WCA IDs and drops @card", () => {
    const usernames = new Map([["rociorodriguez27", rocio]]);
    expect(
      convertTrelloComment(
        "@card @rociorodriguez27 y @otro, mira @board",
        usernames,
      ),
    ).toBe("@2016RIVE14 y @otro, mira @todos");
  });
});

describe("planTrelloImport", () => {
  const matched = new Map([
    ["m-carlos", carlos],
    ["m-rocio", rocio],
  ]);
  const plan = planTrelloImport(trelloExport(), matched);
  const card = plan.cards[0]!;

  it("keeps open lists in Trello order and only named labels", () => {
    expect(plan.lists).toEqual(["Por hacer", "En proceso"]);
    expect(plan.labels).toEqual([{ name: "Constitución", color: "#216e4e" }]);
    expect(plan.skipped).toEqual({
      closedCards: 1,
      automatedComments: 1,
      unnamedLabels: 1,
    });
  });

  it("maps a card with its members, checklist, attachments and dates", () => {
    expect(plan.cards).toHaveLength(1);
    expect(card).toMatchObject({
      listIndex: 0,
      title: "Banco AMS",
      description:
        "Responsables en Trello sin cuenta AMS: Benjamín Sánchez Magaña",
      dueDate: new Date("2026-03-12T18:00:00.000Z"),
      labelIndexes: [0],
      memberUserIds: ["u-carlos"],
      checklists: [
        {
          title: "Pasos",
          items: [
            { title: "Primero", done: true },
            { title: "Segundo", done: false },
          ],
        },
      ],
      attachments: [
        { name: "logo.png (en Trello)", url: "https://trello.com/c/abc" },
        { name: "Doc", url: "https://docs.google.com/d/1" },
      ],
    });
    expect(card.createdAt).toEqual(
      dateFromTrelloId("65e00451642e4debfb59b026"),
    );
  });

  it("orders comments and credits people without an account by name", () => {
    expect(card.comments).toEqual([
      {
        authorUserId: "u-carlos",
        body: "@2016RIVE14 revisa esto",
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
      },
      {
        authorUserId: null,
        body: "**Benjamín Sánchez Magaña** (Trello): Ya quedó",
        createdAt: new Date("2026-03-02T00:00:00.000Z"),
      },
    ]);
  });
});
