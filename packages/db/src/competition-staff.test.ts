import { describe, expect, it } from "vitest";

import {
  CompetitionStaffError,
  normalizeStaffMemberInput,
  resolveStaffCourseStatus,
  type StaffAccountCourse,
  type StaffCourseLookups,
} from "./competition-staff";

const completedAt = new Date("2025-03-01T12:00:00Z");
const legacyAt = new Date("2023-06-10T12:00:00Z");

function lookups(input: {
  byWcaId?: Record<string, StaffAccountCourse>;
  byEmail?: Record<string, StaffAccountCourse>;
  legacy?: Record<string, Date>;
}): StaffCourseLookups {
  return {
    accountsByWcaId: new Map(Object.entries(input.byWcaId ?? {})),
    accountsByEmail: new Map(Object.entries(input.byEmail ?? {})),
    legacyCompletedByEmail: new Map(Object.entries(input.legacy ?? {})),
  };
}

const completedAccount: StaffAccountCourse = {
  email: "ana@example.com",
  enrolled: true,
  completedAt,
  folio: "AMS-123",
};

describe("resolveStaffCourseStatus", () => {
  it("matches an account by WCA ID before email", () => {
    const result = resolveStaffCourseStatus(
      { wcaId: "2016TORO03", email: "otra@example.com" },
      lookups({
        byWcaId: { "2016TORO03": completedAccount },
        byEmail: {
          "otra@example.com": {
            email: "otra@example.com",
            enrolled: false,
            completedAt: null,
            folio: null,
          },
        },
      }),
    );
    expect(result).toEqual({
      status: "completed",
      completedAt,
      folio: "AMS-123",
      source: "ams",
    });
  });

  it("falls back to email when there is no WCA ID match", () => {
    const result = resolveStaffCourseStatus(
      { wcaId: "2020NOPE01", email: "ana@example.com" },
      lookups({ byEmail: { "ana@example.com": completedAccount } }),
    );
    expect(result.status).toBe("completed");
  });

  it("counts unclaimed WordPress completions by the entered email", () => {
    const result = resolveStaffCourseStatus(
      { wcaId: null, email: "legacy@example.com" },
      lookups({ legacy: { "legacy@example.com": legacyAt } }),
    );
    expect(result).toEqual({
      status: "completed",
      completedAt: legacyAt,
      folio: null,
      source: "wordpress",
    });
  });

  it("counts WordPress completions under the matched account's email", () => {
    const result = resolveStaffCourseStatus(
      { wcaId: "2016TORO03", email: null },
      lookups({
        byWcaId: {
          "2016TORO03": {
            email: "cuenta@example.com",
            enrolled: false,
            completedAt: null,
            folio: null,
          },
        },
        legacy: { "cuenta@example.com": legacyAt },
      }),
    );
    expect(result.status).toBe("completed");
  });

  it("reports progress for accounts that have not finished", () => {
    const account = {
      email: "b@example.com",
      completedAt: null,
      folio: null,
    };
    expect(
      resolveStaffCourseStatus(
        { wcaId: null, email: "b@example.com" },
        lookups({
          byEmail: { "b@example.com": { ...account, enrolled: true } },
        }),
      ),
    ).toEqual({ status: "in_progress" });
    expect(
      resolveStaffCourseStatus(
        { wcaId: null, email: "b@example.com" },
        lookups({
          byEmail: { "b@example.com": { ...account, enrolled: false } },
        }),
      ),
    ).toEqual({ status: "not_enrolled" });
  });

  it("reports no account when nothing matches", () => {
    expect(
      resolveStaffCourseStatus({ wcaId: null, email: null }, lookups({})),
    ).toEqual({ status: "no_account" });
  });
});

describe("normalizeStaffMemberInput", () => {
  it("trims, uppercases the WCA ID, lowercases email and orders activities", () => {
    expect(
      normalizeStaffMemberInput({
        name: "  Ana   López ",
        wcaId: " 2016toro03 ",
        email: " Ana@Example.COM ",
        activities: ["runner", "judge", "judge"],
      }),
    ).toEqual({
      name: "Ana López",
      wcaId: "2016TORO03",
      email: "ana@example.com",
      activities: ["judge", "runner"],
    });
  });

  it("treats blank identifiers as missing", () => {
    expect(
      normalizeStaffMemberInput({
        name: "Ana",
        wcaId: "  ",
        email: "",
        activities: [],
      }),
    ).toMatchObject({ wcaId: null, email: null });
  });

  it.each([
    [{ name: " " }, "Escribe el nombre"],
    [{ wcaId: "TORO03" }, "WCA ID inválido (ej. 2016TORO03)"],
    [{ email: "no-es-correo" }, "Correo inválido"],
    [{ activities: ["dj"] }, "Actividad de staff inválida"],
  ])("rejects invalid input %#", (override, message) => {
    expect(() =>
      normalizeStaffMemberInput({ name: "Ana", activities: [], ...override }),
    ).toThrow(new CompetitionStaffError(message));
  });
});
