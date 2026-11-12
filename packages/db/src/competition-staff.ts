import { and, asc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import type { db } from "./index";
import {
  competitionStaffMembers,
  courseEnrollments,
  courseLegacyRecords,
  courseLegacyStudents,
  courses,
  user,
} from "./schema";
import {
  isStaffActivity,
  STAFF_ACTIVITIES,
  type StaffActivity,
} from "./staff-labels";

/** "Capacitación de Staff" imported from the WordPress LMS (Sensei course 206). */
export const STAFF_COURSE_LEGACY_ID = 206;
export const MAX_STAFF_MEMBERS = 200;

const WCA_ID_RE = /^\d{4}[A-Z]{4}\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CompetitionStaffError extends Error {}

type DbOrTx = Pick<
  typeof db,
  "select" | "insert" | "update" | "delete" | "query"
>;

export type StaffCourse = { id: number; slug: string; title: string };

export type StaffCourseProgress =
  | {
      status: "completed";
      completedAt: Date;
      folio: string | null;
      source: "ams" | "wordpress";
    }
  | { status: "in_progress" | "not_enrolled" | "no_account" };

export type StaffMemberInput = {
  name: string;
  wcaId?: string | null;
  email?: string | null;
  activities: string[];
};

export type NormalizedStaffMember = {
  name: string;
  wcaId: string | null;
  email: string | null;
  activities: StaffActivity[];
};

export type CompetitionStaffEntry = NormalizedStaffMember & {
  id: number;
  /** `null` when the staff course is not published. */
  course: StaffCourseProgress | null;
};

export type StaffAccountCourse = {
  email: string;
  enrolled: boolean;
  completedAt: Date | null;
  folio: string | null;
};

export type StaffCourseLookups = {
  accountsByWcaId: Map<string, StaffAccountCourse>;
  accountsByEmail: Map<string, StaffAccountCourse>;
  /** Completed WordPress enrollments not yet claimed into an AMS account. */
  legacyCompletedByEmail: Map<string, Date>;
};

export function normalizeStaffMemberInput(
  input: StaffMemberInput,
): NormalizedStaffMember {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) throw new CompetitionStaffError("Escribe el nombre");
  if (name.length > 120) {
    throw new CompetitionStaffError("El nombre es demasiado largo");
  }

  const wcaId = input.wcaId?.trim().toUpperCase() || null;
  if (wcaId && !WCA_ID_RE.test(wcaId)) {
    throw new CompetitionStaffError("WCA ID inválido (ej. 2016TORO03)");
  }

  const email = input.email?.trim().toLowerCase() || null;
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) {
    throw new CompetitionStaffError("Correo inválido");
  }

  if (input.activities.some((activity) => !isStaffActivity(activity))) {
    throw new CompetitionStaffError("Actividad de staff inválida");
  }
  const activities = STAFF_ACTIVITIES.filter((activity) =>
    input.activities.includes(activity),
  );

  return { name, wcaId, email, activities };
}

/** Matches by WCA ID first, then email; legacy WordPress completions count too. */
export function resolveStaffCourseStatus(
  entry: { wcaId: string | null; email: string | null },
  lookups: StaffCourseLookups,
): StaffCourseProgress {
  const account =
    (entry.wcaId ? lookups.accountsByWcaId.get(entry.wcaId) : undefined) ??
    (entry.email ? lookups.accountsByEmail.get(entry.email) : undefined);

  if (account?.completedAt) {
    return {
      status: "completed",
      completedAt: account.completedAt,
      folio: account.folio,
      source: "ams",
    };
  }

  const legacyCompletedAt = [entry.email, account?.email]
    .filter((email): email is string => Boolean(email))
    .map((email) => lookups.legacyCompletedByEmail.get(email))
    .find(Boolean);
  if (legacyCompletedAt) {
    return {
      status: "completed",
      completedAt: legacyCompletedAt,
      folio: null,
      source: "wordpress",
    };
  }

  if (!account) return { status: "no_account" };
  return { status: account.enrolled ? "in_progress" : "not_enrolled" };
}

export async function getStaffCourse(
  dbOrTx: DbOrTx,
): Promise<StaffCourse | null> {
  const course = await dbOrTx.query.courses.findFirst({
    where: and(
      eq(courses.legacyId, STAFF_COURSE_LEGACY_ID),
      eq(courses.status, "published"),
    ),
    columns: { id: true, slug: true, title: true },
  });
  return course ?? null;
}

async function loadCourseLookups(
  dbOrTx: DbOrTx,
  courseId: number,
  rows: { wcaId: string | null; email: string | null }[],
): Promise<StaffCourseLookups> {
  const wcaIds = [...new Set(rows.flatMap((row) => row.wcaId ?? []))];
  const emails = [...new Set(rows.flatMap((row) => row.email ?? []))];
  const lookups: StaffCourseLookups = {
    accountsByWcaId: new Map(),
    accountsByEmail: new Map(),
    legacyCompletedByEmail: new Map(),
  };
  if (wcaIds.length === 0 && emails.length === 0) return lookups;

  const lowerEmail = sql<string>`lower(${user.email})`;
  const accountFilters = [
    wcaIds.length > 0 ? inArray(user.wcaId, wcaIds) : undefined,
    emails.length > 0 ? inArray(lowerEmail, emails) : undefined,
  ].filter((filter) => filter !== undefined);
  const accounts = await dbOrTx
    .select({
      wcaId: user.wcaId,
      email: lowerEmail,
      enrollmentId: courseEnrollments.id,
      completedAt: courseEnrollments.completedAt,
      certificate: courseEnrollments.certificate,
    })
    .from(user)
    .leftJoin(
      courseEnrollments,
      and(
        eq(courseEnrollments.userId, user.id),
        eq(courseEnrollments.courseId, courseId),
      ),
    )
    .where(or(...accountFilters));

  for (const account of accounts) {
    const value: StaffAccountCourse = {
      email: account.email,
      enrolled: account.enrollmentId !== null,
      completedAt: account.completedAt,
      folio: account.certificate?.folio ?? null,
    };
    if (account.wcaId) lookups.accountsByWcaId.set(account.wcaId, value);
    lookups.accountsByEmail.set(account.email, value);
  }

  const legacyEmails = [
    ...new Set([...emails, ...accounts.map((account) => account.email)]),
  ];
  if (legacyEmails.length > 0) {
    const legacy = await dbOrTx
      .select({
        email: courseLegacyStudents.email,
        completedAt: courseLegacyRecords.completedAt,
      })
      .from(courseLegacyRecords)
      .innerJoin(
        courseLegacyStudents,
        eq(courseLegacyStudents.id, courseLegacyRecords.studentId),
      )
      .where(
        and(
          eq(courseLegacyRecords.courseId, courseId),
          isNull(courseLegacyRecords.lessonId),
          isNotNull(courseLegacyRecords.completedAt),
          inArray(courseLegacyStudents.email, legacyEmails),
        ),
      );
    for (const record of legacy) {
      if (record.completedAt) {
        lookups.legacyCompletedByEmail.set(record.email, record.completedAt);
      }
    }
  }

  return lookups;
}

export async function listCompetitionStaff(
  dbOrTx: DbOrTx,
  competitionId: number,
): Promise<{ course: StaffCourse | null; members: CompetitionStaffEntry[] }> {
  const [course, rows] = await Promise.all([
    getStaffCourse(dbOrTx),
    dbOrTx
      .select({
        id: competitionStaffMembers.id,
        name: competitionStaffMembers.name,
        wcaId: competitionStaffMembers.wcaId,
        email: competitionStaffMembers.email,
        activities: competitionStaffMembers.activities,
      })
      .from(competitionStaffMembers)
      .where(eq(competitionStaffMembers.competitionId, competitionId))
      .orderBy(
        asc(competitionStaffMembers.createdAt),
        asc(competitionStaffMembers.id),
      ),
  ]);

  const lookups = course
    ? await loadCourseLookups(dbOrTx, course.id, rows)
    : null;

  return {
    course,
    members: rows.map((row) => ({
      ...row,
      course: lookups ? resolveStaffCourseStatus(row, lookups) : null,
    })),
  };
}

async function assertNoDuplicate(
  dbOrTx: DbOrTx,
  competitionId: number,
  member: NormalizedStaffMember,
  exceptId?: number,
) {
  const identity = [
    member.wcaId ? eq(competitionStaffMembers.wcaId, member.wcaId) : undefined,
    member.email ? eq(competitionStaffMembers.email, member.email) : undefined,
  ].filter((filter) => filter !== undefined);
  if (identity.length === 0) return;

  const existing = await dbOrTx
    .select({
      id: competitionStaffMembers.id,
      wcaId: competitionStaffMembers.wcaId,
    })
    .from(competitionStaffMembers)
    .where(
      and(
        eq(competitionStaffMembers.competitionId, competitionId),
        or(...identity),
      ),
    );
  const duplicate = existing.find((row) => row.id !== exceptId);
  if (duplicate) {
    throw new CompetitionStaffError(
      member.wcaId && duplicate.wcaId === member.wcaId
        ? "Ya hay alguien en la lista con ese WCA ID"
        : "Ya hay alguien en la lista con ese correo",
    );
  }
}

export async function addCompetitionStaff(
  dbOrTx: DbOrTx,
  input: { competitionId: number; actorId: string; member: StaffMemberInput },
) {
  const member = normalizeStaffMemberInput(input.member);
  const [{ count } = { count: 0 }] = await dbOrTx
    .select({ count: sql<number>`count(*)::int` })
    .from(competitionStaffMembers)
    .where(eq(competitionStaffMembers.competitionId, input.competitionId));
  if (count >= MAX_STAFF_MEMBERS) {
    throw new CompetitionStaffError(
      `La lista de staff admite hasta ${MAX_STAFF_MEMBERS} personas`,
    );
  }
  await assertNoDuplicate(dbOrTx, input.competitionId, member);

  const [row] = await dbOrTx
    .insert(competitionStaffMembers)
    .values({
      competitionId: input.competitionId,
      createdByUserId: input.actorId,
      ...member,
    })
    .returning({ id: competitionStaffMembers.id });
  if (!row) throw new CompetitionStaffError("No se pudo agregar a la persona");
  return row.id;
}

export async function updateCompetitionStaff(
  dbOrTx: DbOrTx,
  input: { competitionId: number; memberId: number; member: StaffMemberInput },
) {
  const member = normalizeStaffMemberInput(input.member);
  await assertNoDuplicate(dbOrTx, input.competitionId, member, input.memberId);

  const updated = await dbOrTx
    .update(competitionStaffMembers)
    .set({ ...member, updatedAt: new Date() })
    .where(
      and(
        eq(competitionStaffMembers.id, input.memberId),
        eq(competitionStaffMembers.competitionId, input.competitionId),
      ),
    )
    .returning({ id: competitionStaffMembers.id });
  if (updated.length === 0) {
    throw new CompetitionStaffError("No se encontró a esa persona en la lista");
  }
}

export async function removeCompetitionStaff(
  dbOrTx: DbOrTx,
  input: { competitionId: number; memberId: number },
) {
  const removed = await dbOrTx
    .delete(competitionStaffMembers)
    .where(
      and(
        eq(competitionStaffMembers.id, input.memberId),
        eq(competitionStaffMembers.competitionId, input.competitionId),
      ),
    )
    .returning({ id: competitionStaffMembers.id });
  if (removed.length === 0) {
    throw new CompetitionStaffError("No se encontró a esa persona en la lista");
  }
}
