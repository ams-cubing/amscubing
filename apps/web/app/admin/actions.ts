"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";

import { db } from "@workspace/db";
import { user } from "@workspace/db/schema";
import { MEXICO_REGIONS } from "@workspace/db/data/mexico";

import { requireDelegate } from "@/lib/session";

export type AdminActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const WCA_ID_RE = /^\d{4}[A-Z]{4}\d{2}$/i;
const REGION_IDS = new Set(MEXICO_REGIONS.map((region) => region.id));

function normalizeWcaId(raw: string): string | null {
  const value = raw.trim().toUpperCase();
  return WCA_ID_RE.test(value) ? value : null;
}

function normalizeOptional(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? "";
  return value.length > 0 ? value : null;
}

function revalidateAdminAndDelegates() {
  revalidateTag("public-delegates", "hours");
  revalidatePath("/admin/delegados");
  revalidatePath("/admin/editores");
  revalidatePath("/nosotros");
}

export async function updateDelegateProfile(input: {
  wcaId: string;
  title: string;
  location: string;
  regionId: string;
}): Promise<AdminActionResult> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const wcaId = normalizeWcaId(input.wcaId);
  if (!wcaId) {
    return { ok: false, message: "WCA ID inválido" };
  }

  const regionId = input.regionId.trim();
  if (!REGION_IDS.has(regionId)) {
    return { ok: false, message: "Región inválida" };
  }

  const title = normalizeOptional(input.title);
  const location = normalizeOptional(input.location);

  const existing = await db.query.user.findFirst({
    where: eq(user.wcaId, wcaId),
    columns: { id: true, role: true },
  });

  if (!existing || existing.role !== "delegate") {
    return { ok: false, message: "No hay un delegado con ese WCA ID" };
  }

  await db
    .update(user)
    .set({
      delegateTitle: title,
      delegateLocation: location,
      regionId,
    })
    .where(eq(user.wcaId, wcaId));

  revalidateAdminAndDelegates();
  return { ok: true, message: "Perfil de delegado actualizado" };
}

export async function addDelegate(input: {
  wcaId: string;
  name: string;
  email: string;
  title: string;
  location: string;
  regionId: string;
}): Promise<AdminActionResult> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const wcaId = normalizeWcaId(input.wcaId);
  if (!wcaId) {
    return { ok: false, message: "WCA ID inválido" };
  }

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || !email) {
    return { ok: false, message: "Nombre y correo son obligatorios" };
  }

  const regionId = input.regionId.trim();
  if (!REGION_IDS.has(regionId)) {
    return { ok: false, message: "Región inválida" };
  }

  const title = normalizeOptional(input.title) ?? "Delegado";
  const location = normalizeOptional(input.location);

  const existing = await db.query.user.findFirst({
    where: eq(user.wcaId, wcaId),
    columns: { id: true, role: true },
  });

  if (existing?.role === "delegate") {
    return { ok: false, message: "Esa persona ya es delegado" };
  }

  if (existing) {
    await db
      .update(user)
      .set({
        name,
        email,
        role: "delegate",
        regionId,
        delegateTitle: title,
        delegateLocation: location,
      })
      .where(eq(user.wcaId, wcaId));
  } else {
    await db.insert(user).values({
      id: wcaId,
      name,
      email,
      emailVerified: true,
      wcaId,
      role: "delegate",
      regionId,
      delegateTitle: title,
      delegateLocation: location,
    });
  }

  revalidateAdminAndDelegates();
  return { ok: true, message: "Delegado agregado" };
}

export async function removeDelegate(input: {
  wcaId: string;
}): Promise<AdminActionResult> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const wcaId = normalizeWcaId(input.wcaId);
  if (!wcaId) {
    return { ok: false, message: "WCA ID inválido" };
  }

  if (authResult.session.user.wcaId === wcaId) {
    return {
      ok: false,
      message: "No puedes quitarte el rol de delegado a ti mismo",
    };
  }

  const existing = await db.query.user.findFirst({
    where: eq(user.wcaId, wcaId),
    columns: { id: true, role: true },
  });

  if (!existing || existing.role !== "delegate") {
    return { ok: false, message: "No hay un delegado con ese WCA ID" };
  }

  await db
    .update(user)
    .set({
      role: "user",
      delegateTitle: null,
      delegateLocation: null,
    })
    .where(eq(user.wcaId, wcaId));

  revalidateAdminAndDelegates();
  return { ok: true, message: "Delegado removido del listado público" };
}

export async function grantEditor(input: {
  wcaId: string;
}): Promise<AdminActionResult> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const wcaId = normalizeWcaId(input.wcaId);
  if (!wcaId) {
    return { ok: false, message: "WCA ID inválido" };
  }

  const existing = await db.query.user.findFirst({
    where: eq(user.wcaId, wcaId),
    columns: { id: true, role: true, name: true },
  });

  if (!existing) {
    return {
      ok: false,
      message:
        "No hay cuenta AMS con ese WCA ID. La persona debe iniciar sesión primero.",
    };
  }

  if (existing.role === "delegate") {
    return {
      ok: false,
      message:
        "Esa persona ya es delegado y tendrá acceso editorial al blog sin rol editor.",
    };
  }

  if (existing.role === "editor") {
    return { ok: false, message: "Esa persona ya es editora" };
  }

  await db
    .update(user)
    .set({ role: "editor" })
    .where(eq(user.wcaId, wcaId));

  revalidateAdminAndDelegates();
  return {
    ok: true,
    message: `Rol editor otorgado a ${existing.name}`,
  };
}

export async function revokeEditor(input: {
  wcaId: string;
}): Promise<AdminActionResult> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { ok: false, message: authResult.message };
  }

  const wcaId = normalizeWcaId(input.wcaId);
  if (!wcaId) {
    return { ok: false, message: "WCA ID inválido" };
  }

  const existing = await db.query.user.findFirst({
    where: eq(user.wcaId, wcaId),
    columns: { id: true, role: true },
  });

  if (!existing || existing.role !== "editor") {
    return { ok: false, message: "No hay un editor con ese WCA ID" };
  }

  await db
    .update(user)
    .set({ role: "user" })
    .where(eq(user.wcaId, wcaId));

  revalidateAdminAndDelegates();
  return { ok: true, message: "Rol editor revocado" };
}
