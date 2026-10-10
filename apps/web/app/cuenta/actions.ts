"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@workspace/db";
import {
  user,
  userProfile,
  blogStaff,
  courseStaff,
  permissionAudit,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getBlogUrl, getCoursesUrl } from "@workspace/auth/urls";
import {
  formatNotificationTitle,
  formatStaffRoleLabel,
  insertNotifications,
} from "@workspace/db/notifications";
import { log } from "@workspace/server/log";
import {
  canGrantPermission,
  validScopedRole,
  type PermissionScope,
} from "@workspace/auth/permissions";
export type ProfileResult = { ok: boolean; message: string };
async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const [member] = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id));
  return member ?? null;
}
export async function saveProfile(
  _: ProfileResult,
  form: FormData,
): Promise<ProfileResult> {
  const member = await currentUser();
  if (!member)
    return { ok: false, message: "Inicia sesión para guardar tu perfil." };
  const name = String(form.get("name") ?? "").trim();
  const city = String(form.get("city") ?? "").trim();
  const biography = String(form.get("biography") ?? "").trim();
  if (
    name.length < 2 ||
    name.length > 120 ||
    city.length > 120 ||
    biography.length > 1000
  )
    return {
      ok: false,
      message:
        "Revisa el nombre (2–120 caracteres), ciudad (máximo 120) y presentación (máximo 1000).",
    };
  await db.transaction(async (tx) => {
    await tx
      .update(user)
      .set({ name, updatedAt: new Date() })
      .where(eq(user.id, member.id));
    await tx
      .insert(userProfile)
      .values({ userId: member.id, city, biography })
      .onConflictDoUpdate({
        target: userProfile.userId,
        set: { city, biography, updatedAt: new Date() },
      });
  });
  revalidatePath("/cuenta");
  return { ok: true, message: "Tu perfil se guardó correctamente." };
}
export async function unlinkWca(): Promise<ProfileResult> {
  const member = await currentUser();
  if (!member || !member.emailVerified)
    return {
      ok: false,
      message: "Verifica tu correo antes de desvincular WCA.",
    };
  const { account } = await import("@workspace/db/schema");
  const { and } = await import("drizzle-orm");
  const [credential] = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(eq(account.userId, member.id), eq(account.providerId, "credential")),
    );
  if (!credential)
    return {
      ok: false,
      message: "Necesitas una contraseña AMS para conservar el acceso.",
    };
  try {
    await auth.api.unlinkAccount({
      headers: await headers(),
      body: { providerId: "wca" },
    });
    revalidatePath("/cuenta");
    return {
      ok: true,
      message:
        "WCA se desvinculó. Tus datos e historial siguen en tu cuenta AMS.",
    };
  } catch {
    return {
      ok: false,
      message: "No se pudo desvincular WCA. Inténtalo de nuevo.",
    };
  }
}
export async function setPermission(
  _: ProfileResult,
  form: FormData,
): Promise<ProfileResult> {
  const member = await currentUser();
  if (!member) return { ok: false, message: "Inicia sesión." };
  const scope = String(form.get("scope"));
  const role = String(form.get("role"));
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (
    (scope !== "blog" && scope !== "courses") ||
    !validScopedRole(scope as PermissionScope, role)
  )
    return { ok: false, message: "Aplicación o permiso no válido." };
  const table = scope === "blog" ? blogStaff : courseStaff;
  const [staff] = await db
    .select()
    .from(table)
    .where(eq(table.userId, member.id));
  if (!canGrantPermission(member.role, staff?.role))
    return {
      ok: false,
      message: "No tienes permiso para administrar esta aplicación.",
    };
  const [target] = await db
    .select()
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`);
  if (!target || !target.emailVerified)
    return {
      ok: false,
      message:
        "La persona debe tener una cuenta AMS y verificar su correo primero.",
    };
  if (target.id === member.id)
    return {
      ok: false,
      message: "Otra persona autorizada debe modificar tus propios permisos.",
    };
  const changed = await db.transaction(async (tx) => {
    // Serialize changes per application and recheck authority inside the transaction.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`ams-permissions-${scope}`}))`,
    );
    const [freshMember] = await tx
      .select()
      .from(user)
      .where(eq(user.id, member.id));
    const [freshStaff] = await tx
      .select()
      .from(table)
      .where(eq(table.userId, member.id));
    if (!freshMember || !canGrantPermission(freshMember.role, freshStaff?.role))
      return false;
    const [before] = await tx
      .select()
      .from(table)
      .where(eq(table.userId, target.id));
    if (role === "none")
      await tx.delete(table).where(eq(table.userId, target.id));
    else if (scope === "blog")
      await tx
        .insert(blogStaff)
        .values({
          userId: target.id,
          role: role as "administrator" | "developer" | "editor",
        })
        .onConflictDoUpdate({
          target: blogStaff.userId,
          set: { role: role as "administrator" | "developer" | "editor" },
        });
    else
      await tx
        .insert(courseStaff)
        .values({
          userId: target.id,
          role: role as "administrator" | "developer" | "instructor",
        })
        .onConflictDoUpdate({
          target: courseStaff.userId,
          set: { role: role as "administrator" | "developer" | "instructor" },
        });
    await tx.insert(permissionAudit).values({
      actorId: member.id,
      targetId: target.id,
      scope,
      previousRole: before?.role ?? null,
      nextRole: role === "none" ? null : role,
    });
    return true;
  });
  if (!changed)
    return {
      ok: false,
      message: "Tu permiso fue revocado. Recarga tu perfil.",
    };
  await notifyStaffChanged({
    scope: scope as PermissionScope,
    recipientId: target.id,
    actorId: member.id,
    role,
  });
  revalidatePath("/cuenta");
  revalidatePath("/admin/permisos");
  return {
    ok: true,
    message: `Permiso actualizado únicamente en ${scope === "blog" ? "Blog" : "Cursos"}.`,
  };
}

async function notifyStaffChanged(opts: {
  scope: PermissionScope;
  recipientId: string;
  actorId: string;
  role: string;
}) {
  const type =
    opts.scope === "blog" ? "blog_staff_changed" : "course_staff_changed";
  const appUrl = opts.scope === "blog" ? getBlogUrl() : getCoursesUrl();
  const roleLabel =
    opts.role === "none" ? undefined : formatStaffRoleLabel(opts.role);
  try {
    await insertNotifications(db, [
      {
        recipientId: opts.recipientId,
        actorId: opts.actorId,
        type,
        title: formatNotificationTitle(type, { roleLabel }),
        href: `${appUrl}${roleLabel ? "/admin" : "/"}`,
        payload: { role: opts.role },
      },
    ]);
  } catch (error) {
    log.error("web.notification_failed", { event: type, error });
  }
}
