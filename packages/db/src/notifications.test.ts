import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
}));

vi.mock("./index", () => ({
  db: {
    select: (...args: unknown[]) => dbMocks.select(...args),
    update: (...args: unknown[]) => dbMocks.update(...args),
  },
}));

import {
  countUnreadNotificationsByCard,
  formatNotificationTitle,
  markCardNotificationsRead,
  notifyAllUsers,
} from "./notifications";

describe("notifyAllUsers", () => {
  it("broadcasts with a single insert-select that skips the actor", async () => {
    const execute = vi.fn();
    await notifyAllUsers({ execute } as never, {
      actorId: "actor-1",
      type: "course_published",
      title: "Nuevo curso: «Cubo 3x3»",
      href: "https://cursos.example/cursos/cubo",
      payload: { courseId: 3, courseTitle: "Cubo 3x3" },
    });

    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0] as SQL);
    expect(query.sql).toContain('insert into "notification"');
    expect(query.sql).toContain('select "user"."id"');
    expect(query.sql).toContain("::notification_type");
    expect(query.sql).toContain('"user"."id" <> $');
    expect(query.params).toEqual([
      "actor-1",
      "course_published",
      "Nuevo curso: «Cubo 3x3»",
      "https://cursos.example/cursos/cubo",
      JSON.stringify({ courseId: 3, courseTitle: "Cubo 3x3" }),
      "actor-1",
      "actor-1",
    ]);
  });
});

describe("formatNotificationTitle", () => {
  it("describes staff role changes and removals", () => {
    expect(
      formatNotificationTitle("blog_staff_changed", { roleLabel: "editor" }),
    ).toBe("Ahora eres editor del blog");
    expect(formatNotificationTitle("course_staff_changed", {})).toBe(
      "Ya no tienes permisos en Cursos AMS",
    );
  });
});

describe("countUnreadNotificationsByCard", () => {
  beforeEach(() => {
    dbMocks.select.mockReset();
    dbMocks.update.mockReset();
  });

  it("groups unread counts by card id", async () => {
    const groupBy = vi.fn().mockResolvedValue([
      { cardId: 7, value: 2 },
      { cardId: 11, value: 1 },
    ]);
    const where = vi.fn().mockReturnValue({ groupBy });
    const from = vi.fn().mockReturnValue({ where });
    dbMocks.select.mockReturnValue({ from });

    await expect(countUnreadNotificationsByCard("user-1", 10)).resolves.toEqual(
      { 7: 2, 11: 1 },
    );

    expect(dbMocks.select).toHaveBeenCalled();
    expect(from).toHaveBeenCalled();
    expect(where).toHaveBeenCalled();
    expect(groupBy).toHaveBeenCalled();
  });
});

describe("markCardNotificationsRead", () => {
  beforeEach(() => {
    dbMocks.select.mockReset();
    dbMocks.update.mockReset();
  });

  it("marks unread notifications for the card as read", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    dbMocks.update.mockReturnValue({ set });

    await markCardNotificationsRead("user-1", 7);

    expect(dbMocks.update).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ readAt: expect.any(Date) }),
    );
    expect(where).toHaveBeenCalled();
  });
});
