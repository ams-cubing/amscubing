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
  competitionOrganizers: { organizerUserId: "organizer_user_id" },
  boardMembers: { userId: "user_id" },
}));

import { canAccessBoardsApp } from "./boards-access";

const organizer = { id: "user-1", role: "user" };

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
      canAccessBoardsApp({ id: "d1", role: "delegate" }),
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

  it("looks up organizers by user id, so users without a WCA ID can organize", async () => {
    findOrganizer.mockResolvedValue({ competitionId: 7 });
    const withoutWcaId = { id: "u2", role: "user", wcaId: null };
    await expect(canAccessBoardsApp(withoutWcaId)).resolves.toBe(true);
    expect(findOrganizer).toHaveBeenCalled();
  });
});
