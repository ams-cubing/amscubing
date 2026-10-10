import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect, unauthorized } from "next/navigation";
import { cache } from "react";

import { db } from "@workspace/db";
import { blogStaff, courseStaff } from "@workspace/db/schema";

import { auth } from "@/lib/auth";
import {
  canGrantPermission,
  type PermissionScope,
} from "@workspace/auth/permissions";

export type AdminAccess = {
  isDelegate: boolean;
  managedScopes: PermissionScope[];
};

export const getAdminAccess = cache(async (): Promise<AdminAccess | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) unauthorized();

  const role = session.user.role ?? "user";
  const [[blogPermission], [coursePermission]] = await Promise.all([
    db
      .select({ role: blogStaff.role })
      .from(blogStaff)
      .where(eq(blogStaff.userId, session.user.id)),
    db
      .select({ role: courseStaff.role })
      .from(courseStaff)
      .where(eq(courseStaff.userId, session.user.id)),
  ]);

  const managedScopes: PermissionScope[] = [
    ...(canGrantPermission(role, blogPermission?.role)
      ? ["blog" as const]
      : []),
    ...(canGrantPermission(role, coursePermission?.role)
      ? ["courses" as const]
      : []),
  ];
  const isDelegate = role === "delegate";

  if (!isDelegate && managedScopes.length === 0) return null;
  return { isDelegate, managedScopes };
});

export async function requireDelegateAdminPage() {
  const access = await getAdminAccess();
  if (!access?.isDelegate) redirect("/admin/permisos");
}
