import { cache } from "react";
import { createAuth } from "@workspace/auth";
import { db } from "@workspace/db";
import { blogStaff, user } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { canManageBlog } from "./permissions";
import { getBlogUrl, getCrossAppSignInUrl } from "./urls";
export const auth = createAuth();
export function signInUrl(path = "/") {
  return getCrossAppSignInUrl(`${getBlogUrl()}${path}`);
}
export const getViewer = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const [viewer] = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id));
  if (!viewer) return null;
  const [staff] = await db
    .select()
    .from(blogStaff)
    .where(eq(blogStaff.userId, viewer.id));
  return {
    ...viewer,
    staffRole: staff?.role ?? null,
    canManage: canManageBlog(viewer.role, staff?.role),
  };
});
export async function requireViewer(path = "/") {
  const viewer = await getViewer();
  if (!viewer) redirect(signInUrl(path));
  return viewer;
}
export async function requireManager() {
  const viewer = await requireViewer("/admin");
  if (!viewer.canManage) forbidden();
  return viewer;
}
