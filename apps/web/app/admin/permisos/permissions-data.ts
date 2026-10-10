import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@workspace/db";
import {
  blogStaff,
  courseStaff,
  permissionAudit,
  user as userTable,
} from "@workspace/db/schema";

import type { PermissionScope } from "@workspace/auth/permissions";

export type PermissionsData = Awaited<ReturnType<typeof loadPermissionsData>>;
export type TeamMember =
  | PermissionsData["blogTeam"][number]
  | PermissionsData["courseTeam"][number];
export type PermissionAuditEntry = PermissionsData["audit"][number];

export async function loadPermissionsData(managedScopes: PermissionScope[]) {
  const [audit, blogTeam, courseTeam] = await Promise.all([
    managedScopes.length
      ? db
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
      : [],
    managedScopes.includes("blog")
      ? db
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
      : [],
    managedScopes.includes("courses")
      ? db
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
      : [],
  ]);

  return { audit, blogTeam, courseTeam };
}
