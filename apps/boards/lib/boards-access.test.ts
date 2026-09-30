import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@workspace/db";
import type { User } from "@workspace/db/schema";

import { getBoardMocks, resetBoardMocks } from "@/test/setup-server-mocks";

const { canAccessBoard } =
  await vi.importActual<typeof import("@/lib/boards")>("@/lib/boards");

const organizer = {
  id: "user-org",
  role: "user",
  wcaId: "2016AREL01",
} as unknown as User;

const query = db.query as unknown as {
  boardMembers: { findFirst: ReturnType<typeof vi.fn> };
  competitionDelegates: { findFirst: ReturnType<typeof vi.fn> };
  competitionOrganizers: { findFirst: ReturnType<typeof vi.fn> };
};

describe("canAccessBoard", () => {
  beforeEach(() => {
    resetBoardMocks();
    query.boardMembers.findFirst.mockReset();
    query.competitionDelegates.findFirst.mockReset();
    query.competitionOrganizers.findFirst.mockReset();
    getBoardMocks().findFirstBoard.mockResolvedValue({
      id: 5,
      isTemplate: false,
      competitionId: 42,
    });
  });

  it("lets a competition organizer open the board without the pilot allowlist", async () => {
    query.boardMembers.findFirst.mockResolvedValue(undefined);
    query.competitionDelegates.findFirst.mockResolvedValue(undefined);
    query.competitionOrganizers.findFirst.mockResolvedValue({
      competitionId: 42,
    });

    await expect(canAccessBoard(organizer, 5)).resolves.toBe(true);
  });

  it("denies users unrelated to the board's competition", async () => {
    query.boardMembers.findFirst.mockResolvedValue(undefined);
    query.competitionDelegates.findFirst.mockResolvedValue(undefined);
    query.competitionOrganizers.findFirst.mockResolvedValue(undefined);

    await expect(canAccessBoard(organizer, 5)).resolves.toBe(false);
  });

  it("denies templates to non-delegates", async () => {
    getBoardMocks().findFirstBoard.mockResolvedValue({
      id: 5,
      isTemplate: true,
      competitionId: null,
    });

    await expect(canAccessBoard(organizer, 5)).resolves.toBe(false);
  });

  it("always allows delegates", async () => {
    await expect(
      canAccessBoard({ ...organizer, role: "delegate" } as User, 5),
    ).resolves.toBe(true);
  });
});
