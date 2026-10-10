import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({ db: {} }));

import { formatNotificationTitle, notifyAllUsers } from "./notifications";

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
