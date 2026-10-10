import { cache } from "react";
import { createAuth } from "@workspace/auth";
import { db } from "@workspace/db";
import { courseStaff, user } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { canManageCourses } from "./permissions";
import { claimLegacyProgress } from "./legacy";
import { getCoursesUrl, getCrossAppSignInUrl } from "./urls";

export const auth = createAuth();
export function signInUrl(path = "/mis-cursos") {
  return getCrossAppSignInUrl(`${getCoursesUrl()}${path}`);
}
export const getViewer = cache(async () => {
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
  return {
    ...viewer,
    staffRole: staff?.role ?? null,
    canManage: canManageCourses(viewer.role, staff?.role),
  };
});
/** Viewer for learning pages: also links WordPress history on first visit. */
export const getLearner = cache(async () => {
  const viewer = await getViewer();
  if (viewer) await claimLegacyProgress(viewer);
  return viewer;
});
export async function requireViewer(path = "/mis-cursos") {
  const viewer = await getLearner();
  if (!viewer) redirect(signInUrl(path));
  return viewer;
}
export async function requireManager() {
  const viewer = await getViewer();
  if (!viewer) redirect(signInUrl("/admin"));
  if (!viewer.canManage) forbidden();
  return viewer;
}
