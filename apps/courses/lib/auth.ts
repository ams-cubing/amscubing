import { createAuth } from "@workspace/auth";
import { getCrossAppSignInUrl, getCoursesUrl } from "@workspace/auth/urls";
import { db } from "@workspace/db";
import { courseStaff, user } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { canManageCourses, canManageStaff } from "./permissions";
import { claimLegacyProgress } from "./legacy";

export const auth = createAuth();
export function signInUrl(path = "/mis-cursos") {
  return getCrossAppSignInUrl(`${getCoursesUrl()}${path}`);
}
export async function getViewer() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  // Read current permissions from DB, rather than trusting a cached session role.
  const [viewer] = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id));
  if (!viewer) return null;
  const [staff] = await db
    .select()
    .from(courseStaff)
    .where(eq(courseStaff.userId, viewer.id));
  await claimLegacyProgress(viewer);
  return {
    ...viewer,
    staffRole: staff?.role ?? null,
    canManage: canManageCourses(viewer.role, staff?.role),
    canManageStaff: canManageStaff(staff?.role),
  };
}
export async function requireViewer(path = "/mis-cursos") {
  const viewer = await getViewer();
  if (!viewer) redirect(signInUrl(path));
  return viewer;
}
export async function requireManager() {
  const viewer = await requireViewer("/admin");
  if (!viewer.canManage) redirect("/mis-cursos?aviso=sin-permiso");
  return viewer;
}
