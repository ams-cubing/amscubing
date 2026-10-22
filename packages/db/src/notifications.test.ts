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
  equipmentConfirmedNotificationRow,
  equipmentNotificationRow,
  equipmentRequestNotificationRow,
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

describe("equipmentNotificationRow", () => {
  const base = {
    actorId: "lender",
    calendarUrl: "https://calendario.example/",
    equipmentLabel: "8 Timer SpeedStack G4",
  };

  it("sends borrowers without the delegate role to mis-competencias", () => {
    const row = equipmentNotificationRow({
      ...base,
      recipient: { id: "org", role: "user", wcaId: null },
      type: "equipment_loaned",
      loanId: 4,
    });
    expect(row.title).toBe("Te prestaron equipo: 8 Timer SpeedStack G4");
    expect(row.href).toBe("https://calendario.example/mis-competencias");
    expect(row.payload).toEqual({ loanId: 4, sku: undefined });
  });

  it("sends delegates to the loan or unit in the panel", () => {
    const delegate = {
      id: "d1",
      role: "delegate" as const,
      wcaId: "2016ROVI01",
    };
    expect(
      equipmentNotificationRow({
        ...base,
        recipient: delegate,
        type: "equipment_returned",
        loanId: 4,
      }).href,
    ).toBe("https://calendario.example/panel/equipo/prestamos/4");
    expect(
      equipmentNotificationRow({
        ...base,
        recipient: delegate,
        type: "equipment_transferred",
        equipmentLabel: "DS3-2318",
        sku: "DS3-2318",
      }),
    ).toMatchObject({
      title: "Ahora eres guardián de: DS3-2318",
      href: "https://calendario.example/panel/equipo/DS3-2318",
    });
  });
});

describe("equipmentRequestNotificationRow", () => {
  it("sends delegates to the competition in the panel", () => {
    expect(
      equipmentRequestNotificationRow({
        recipient: { id: "d1", role: "delegate", wcaId: "2016ROVI01" },
        actorId: "organizer-1",
        calendarUrl: "https://calendario.example/",
        competitionId: 9,
        requestId: 2,
        city: "Querétaro",
      }),
    ).toEqual({
      recipientId: "d1",
      actorId: "organizer-1",
      type: "equipment_requested",
      title: "Solicitud de equipo para Querétaro",
      href: "https://calendario.example/panel/competencias/9",
      payload: { competitionId: 9, requestId: 2, city: "Querétaro" },
    });
  });
});

describe("equipmentConfirmedNotificationRow", () => {
  const base = {
    recipient: { id: "o1", role: "user" as const, wcaId: null },
    actorId: "delegate-1",
    urls: {
      calendarUrl: "https://calendario.example/",
      boardsUrl: "https://tableros.example/",
    },
    competitionId: 9,
    requestId: 2,
    city: "Querétaro",
  };

  it("opens the equipment card on the competition board", () => {
    expect(
      equipmentConfirmedNotificationRow({ ...base, boardId: 4, cardId: 31 }),
    ).toMatchObject({
      recipientId: "o1",
      type: "equipment_confirmed",
      title: "El delegado confirmó el equipo para Querétaro",
      href: "https://tableros.example/boards/4?card=31",
      payload: { boardId: 4, cardId: 31, requestId: 2 },
    });
  });

  it("falls back to mis-competencias without a board", () => {
    expect(equipmentConfirmedNotificationRow(base).href).toBe(
      "https://calendario.example/mis-competencias",
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
