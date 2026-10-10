"use client";
import { useActionState, useState } from "react";
import { saveProfile, setPermission } from "@/app/cuenta/actions";
import { roleLabel } from "@workspace/auth/permissions";
const initial = { ok: false, message: "" };
const field =
  "mt-2 w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-ams-navy";
const button =
  "rounded-xl bg-ams-red px-5 py-3 text-sm font-bold text-white disabled:opacity-50";
export function ProfileForm({
  name,
  email,
  city,
  biography,
}: {
  name: string;
  email: string;
  city: string;
  biography: string;
}) {
  const [state, action, pending] = useActionState(saveProfile, initial);
  return (
    <form action={action} className="ams-copy space-y-5">
      <label className="block text-sm font-bold">
        Nombre para mostrar
        <input
          name="name"
          autoComplete="name"
          defaultValue={name}
          required
          minLength={2}
          maxLength={120}
          className={field}
        />
      </label>
      <label className="block text-sm font-bold">
        Correo de acceso
        <input
          value={email}
          readOnly
          type="email"
          className={`${field} bg-ams-soft`}
        />
        <span className="mt-2 block text-xs font-normal text-black/60">
          Este correo identifica tu cuenta y se utiliza para verificarla y
          recuperar el acceso.
        </span>
      </label>
      <label className="block text-sm font-bold">
        Ciudad
        <input
          name="city"
          autoComplete="address-level2"
          defaultValue={city}
          maxLength={120}
          className={field}
        />
      </label>
      <label className="block text-sm font-bold">
        Sobre ti
        <textarea
          name="biography"
          defaultValue={biography}
          maxLength={1000}
          rows={4}
          className={field}
        />
      </label>
      <p className="text-xs text-black/60">
        Tu ciudad y presentación se conservan en tu perfil privado. El nombre
        aparece en tus comentarios y publicaciones nuevas.
      </p>
      <button disabled={pending} className={button}>
        {pending ? "Guardando…" : "Guardar datos"}
      </button>
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={state.ok ? "text-ams-green" : "text-ams-red"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
export function PermissionForm({ scopes }: { scopes: ("blog" | "courses")[] }) {
  const [state, action, pending] = useActionState(setPermission, initial);
  const [scope, setScope] = useState(scopes[0] ?? "blog");
  return (
    <form action={action} className="ams-copy grid gap-4 md:grid-cols-2">
      <label className="text-sm font-bold">
        Correo de la persona
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          placeholder="persona@ejemplo.com"
          className={field}
        />
      </label>
      <label className="text-sm font-bold">
        Aplicación
        <select
          name="scope"
          value={scope}
          onChange={(event) =>
            setScope(event.target.value as "blog" | "courses")
          }
          className={field}
        >
          {scopes.map((scope) => (
            <option key={scope} value={scope}>
              {scope === "blog" ? "Blog" : "Cursos"}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-bold">
        Permiso
        <select key={scope} name="role" className={field}>
          <option value="none">Retirar permiso de gestión</option>
          <option value="administrator">Administrador</option>
          <option value="developer">Desarrollador</option>
          {scope === "blog" ? (
            <option value="editor">Editor (Blog)</option>
          ) : (
            <option value="instructor">Instructor (Cursos)</option>
          )}
        </select>
      </label>
      <div className="flex items-end">
        <button disabled={pending} className={button}>
          {pending ? "Actualizando…" : "Actualizar permiso"}
        </button>
      </div>
      <p className="text-xs leading-5 text-black/60 md:col-span-2">
        La persona debe verificar su correo. Cada aplicación tiene permisos
        independientes. Los cambios quedan registrados; tus propios permisos
        debe modificarlos otra persona autorizada.
      </p>
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`md:col-span-2 ${state.ok ? "text-ams-green" : "text-ams-red"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
export function PermissionBadge({ role }: { role?: string | null }) {
  return (
    <span className="inline-flex rounded-full bg-ams-navy px-3 py-1 text-xs font-bold text-white">
      {roleLabel(role)}
    </span>
  );
}
