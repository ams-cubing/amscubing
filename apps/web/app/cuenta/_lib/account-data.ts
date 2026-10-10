import { headers } from "next/headers";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@workspace/db";
import {
  account,
  blogStaff,
  courseStaff,
  permissionAudit,
  user as userTable,
  userProfile,
} from "@workspace/db/schema";
import {
  canGrantPermission,
  type PermissionScope,
} from "@/lib/profile-permissions";

export type AccountData = Awaited<ReturnType<typeof loadAccountData>>;
export type AccountUser = NonNullable<AccountData["user"]>;
export type TeamMember =
  | AccountData["blogTeam"][number]
  | AccountData["courseTeam"][number];
export type PermissionAuditEntry = AccountData["audit"][number];

export async function loadAccountData() {
  const requestHeaders = await headers();
  const session = process.env.BETTER_AUTH_SECRET
    ? await import("@/lib/auth").then(({ auth }) =>
        auth.api.getSession({
          headers: requestHeaders,
        }),
      )
    : null;
  const [user] = session
    ? await db.select().from(userTable).where(eq(userTable.id, session.user.id))
    : [];
  const [blogPermission] = user
    ? await db.select().from(blogStaff).where(eq(blogStaff.userId, user.id))
    : [];
  const [coursePermission] = user
    ? await db.select().from(courseStaff).where(eq(courseStaff.userId, user.id))
    : [];
  const [wcaAccount] = user
    ? await db
        .select({ id: account.id })
        .from(account)
        .where(and(eq(account.userId, user.id), eq(account.providerId, "wca")))
    : [];
  const [profile] = user
    ? await db.select().from(userProfile).where(eq(userProfile.userId, user.id))
    : [];
  const [credential] = user
    ? await db
        .select({ id: account.id })
        .from(account)
        .where(
          and(
            eq(account.userId, user.id),
            eq(account.providerId, "credential"),
          ),
        )
    : [];
  const managedScopes: PermissionScope[] = user
    ? [
        ...(canGrantPermission(user.role, blogPermission?.role)
          ? ["blog" as const]
          : []),
        ...(canGrantPermission(user.role, coursePermission?.role)
          ? ["courses" as const]
          : []),
      ]
    : [];
  const audit = managedScopes.length
    ? await db
        .select({
          id: permissionAudit.id,
          scope: permissionAudit.scope,
          previousRole: permissionAudit.previousRole,
          nextRole: permissionAudit.nextRole,
          createdAt: permissionAudit.createdAt,
          name: userTable.name,
        })
        .from(permissionAudit)
        .leftJoin(userTable, eq(userTable.id, permissionAudit.targetId))
        .where(inArray(permissionAudit.scope, managedScopes))
        .orderBy(desc(permissionAudit.createdAt))
        .limit(10)
    : [];
  const blogTeam = managedScopes.includes("blog")
    ? await db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          role: blogStaff.role,
        })
        .from(blogStaff)
        .innerJoin(userTable, eq(userTable.id, blogStaff.userId))
        .orderBy(userTable.name)
        .limit(200)
    : [];
  const courseTeam = managedScopes.includes("courses")
    ? await db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          role: courseStaff.role,
        })
        .from(courseStaff)
        .innerJoin(userTable, eq(userTable.id, courseStaff.userId))
        .orderBy(userTable.name)
        .limit(200)
    : [];

  return {
    user,
    blogPermission,
    coursePermission,
    wcaAccount,
    profile,
    credential,
    managedScopes,
    audit,
    blogTeam,
    courseTeam,
  };
}

export function getProfileLevel({
  user,
  blogPermission,
  coursePermission,
}: Pick<AccountData, "user" | "blogPermission" | "coursePermission">) {
  const isDelegate = user?.role === "delegate";
  const isEditor = user?.role === "editor";
  return isDelegate
    ? "Delegado WCA"
    : [blogPermission?.role, coursePermission?.role].includes("developer")
      ? "Desarrollador"
      : [blogPermission?.role, coursePermission?.role].includes("administrator")
        ? "Administrador"
        : isEditor || blogPermission || coursePermission
          ? "Colaborador AMS"
          : user?.wcaId
            ? "Competidor"
            : "Miembro";
}
