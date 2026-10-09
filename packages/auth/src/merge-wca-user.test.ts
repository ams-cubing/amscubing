import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction, update, set, where, execute, del, deleteWhere } =
  vi.hoisted(() => {
    const where = vi.fn(async () => undefined);
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));
    const execute = vi.fn(async () => undefined);
    const deleteWhere = vi.fn(async () => undefined);
    const del = vi.fn(() => ({ where: deleteWhere }));
    const transaction = vi.fn(async (fn: (tx: unknown) => Promise<void>) =>
      fn({ update, execute, delete: del }),
    );
    return { transaction, update, set, where, execute, del, deleteWhere };
  });

vi.mock("@workspace/db", () => ({
  db: { transaction },
}));

vi.mock("@workspace/db/schema", () => ({
  account: { name: "account", userId: "user_id" },
  session: { name: "session", userId: "user_id" },
  notifications: {
    name: "notification",
    recipientId: "recipient_id",
    actorId: "actor_id",
  },
  logs: { name: "log", actorId: "actor_id" },
  boardInvites: { name: "board_invite", createdByUserId: "created_by_user_id" },
  cardComments: { name: "card_comment", authorId: "author_id" },
  courses: { name: "course", createdBy: "created_by" },
  blogPosts: { name: "blog_post", authorId: "author_id" },
  blogComments: { name: "blog_comment", authorId: "author_id" },
  courseQuizAttempts: { name: "course_quiz_attempt", userId: "user_id" },
  courseLegacyStudents: {
    name: "course_legacy_student",
    claimedBy: "claimed_by",
  },
  user: { name: "user", id: "id" },
  permissionAudit: {
    name: "permission_audit",
    actorId: "actor_id",
    targetId: "target_id",
  },
}));

import { mergeUserIntoStub } from "./merge-wca-user";

describe("mergeUserIntoStub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is a no-op when both ids are the same row", async () => {
    await mergeUserIntoStub("same", "same");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("moves user-owned rows to the stub and deletes the earlier row", async () => {
    await mergeUserIntoStub("earlier-id", "stub-id");

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith({ userId: "stub-id" });
    expect(set).toHaveBeenCalledWith({ recipientId: "stub-id" });
    expect(set).toHaveBeenCalledWith({ actorId: "stub-id" });
    expect(set).toHaveBeenCalledWith({ createdByUserId: "stub-id" });
    expect(set).toHaveBeenCalledWith({ authorId: "stub-id" });
    expect(set).toHaveBeenCalledWith({ createdBy: "stub-id" });
    expect(set).toHaveBeenCalledWith({ claimedBy: "stub-id" });
    expect(set).toHaveBeenCalledWith({ targetId: "stub-id" });
    expect(update).toHaveBeenCalledTimes(14);
    expect(execute).toHaveBeenCalledTimes(10);
    expect(del).toHaveBeenCalledTimes(1);
    expect(deleteWhere).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(14);
  });
});
