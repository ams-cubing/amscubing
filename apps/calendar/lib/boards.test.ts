import { beforeEach, describe, expect, it, vi } from "vitest";

const { findOrganizer, findMember } = vi.hoisted(() => ({
  findOrganizer: vi.fn(),
  findMember: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: {
    query: {
      competitionOrganizers: { findFirst: findOrganizer },
      boardMembers: { findFirst: findMember },
    },
  },
}));

vi.mock("@workspace/db/schema", () => ({
  competitionOrganizers: { organizerWcaId: "organizer_wca_id" },
  boardMembers: { userId: "user_id" },
}));

import { canSeeBoardsNav } from "./boards";

const user = { id: "user-1", role: "user", wcaId: "2016AREL01" };

describe("canSeeBoardsNav", () => {
  beforeEach(() => {
    findOrganizer.mockReset();
    findOrganizer.mockResolvedValue(undefined);
    findMember.mockReset();
    findMember.mockResolvedValue(undefined);
  });

  it("is false for anonymous users", async () => {
    await expect(canSeeBoardsNav(null)).resolves.toBe(false);
    await expect(canSeeBoardsNav(undefined)).resolves.toBe(false);
  });

  it("is true for delegates", async () => {
    await expect(
      canSeeBoardsNav({ id: "d1", role: "delegate", wcaId: "2010DEL01" }),
    ).resolves.toBe(true);
  });

  it("is true for organizers", async () => {
    findOrganizer.mockResolvedValue({ competitionId: 42 });
    await expect(canSeeBoardsNav(user)).resolves.toBe(true);
  });

  it("is true for board members", async () => {
    findMember.mockResolvedValue({ boardId: 5 });
    await expect(canSeeBoardsNav(user)).resolves.toBe(true);
  });

  it("is false for users with no competitions or boards", async () => {
    await expect(canSeeBoardsNav(user)).resolves.toBe(false);
  });
});
