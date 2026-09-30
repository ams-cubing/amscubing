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

import { canAccessBoardsApp } from "./boards-access";

const organizer = { id: "user-1", role: "user", wcaId: "2016AREL01" };

describe("canAccessBoardsApp", () => {
  beforeEach(() => {
    findOrganizer.mockReset();
    findOrganizer.mockResolvedValue(undefined);
    findMember.mockReset();
    findMember.mockResolvedValue(undefined);
  });

  it("is false for anonymous users", async () => {
    await expect(canAccessBoardsApp(null)).resolves.toBe(false);
    await expect(canAccessBoardsApp(undefined)).resolves.toBe(false);
  });

  it("is true for delegates without querying the database", async () => {
    await expect(
      canAccessBoardsApp({ id: "d1", role: "delegate", wcaId: "2010DEL01" }),
    ).resolves.toBe(true);
    expect(findOrganizer).not.toHaveBeenCalled();
    expect(findMember).not.toHaveBeenCalled();
  });

  it("is true for organizers of any competition", async () => {
    findOrganizer.mockResolvedValue({ competitionId: 42 });
    await expect(canAccessBoardsApp(organizer)).resolves.toBe(true);
  });

  it("is true for board members who organize nothing", async () => {
    findMember.mockResolvedValue({ boardId: 5 });
    await expect(canAccessBoardsApp(organizer)).resolves.toBe(true);
  });

  it("is false for users who neither organize nor belong to a board", async () => {
    await expect(canAccessBoardsApp(organizer)).resolves.toBe(false);
  });
});
