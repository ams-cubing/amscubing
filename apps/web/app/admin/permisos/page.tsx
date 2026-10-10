import type { Metadata } from "next";
import { forbidden } from "next/navigation";

import { PermissionBadge, PermissionForm } from "@/components/profile-forms";
import { roleLabel } from "@workspace/auth/permissions";

import { getAdminAccess } from "@/app/admin/_lib/admin-access";
import { loadPermissionsData } from "@/app/admin/permisos/permissions-data";

export const metadata: Metadata = {
  title: "Permisos | Admin AMS",
  description: "Asigna permisos de Blog y Cursos al equipo AMS.",
};

export default async function AdminPermissionsPage() {
  const access = await getAdminAccess();
  if (!access) forbidden();
  const { managedScopes } = access;
  const { audit, blogTeam, courseTeam } =
    await loadPermissionsData(managedScopes);

  const teams = [
    { scope: "blog" as const, title: "Equipo de Blog", rows: blogTeam },
    { scope: "courses" as const, title: "Equipo de Cursos", rows: courseTeam },
  ].filter((team) => managedScopes.includes(team.scope));

  return (
    <div className="space-y-12">
      <header>
        <p className="ams-heading text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
          Equipo AMS
        </p>
        <h2 className="ams-display mt-2 text-[clamp(1.8rem,4vw,2.75rem)] leading-none text-ams-navy">
          Permisos
        </h2>
        <p className="ams-copy mt-3 max-w-2xl text-base leading-7 text-black/65">
          Puedes gestionar:{" "}
          {managedScopes
            .map((scope) => (scope === "blog" ? "Blog" : "Cursos"))
            .join(" y ")}
          . Los permisos se conceden por aplicación; ser editor de Blog no da
          acceso a la gestión de Cursos.
        </p>
      </header>

      <section className="rounded-5.5 border border-black/10 bg-white p-6 md:p-8">
        <h3 className="ams-display mb-6 text-2xl leading-none text-ams-navy">
          Asignar permiso
        </h3>
        <PermissionForm scopes={managedScopes} />
      </section>

      <section className="grid gap-6 rounded-5.5 bg-ams-soft p-6 md:p-8 lg:grid-cols-2">
        {teams.map((team) => (
          <div key={team.scope}>
            <h3 className="mb-3 font-bold">{team.title}</h3>
            {team.rows.length ? (
              <ul className="ams-copy divide-y divide-black/10 text-sm">
                {team.rows.map((person) => (
                  <li
                    key={person.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="font-bold">{person.name}</p>
                      <p className="break-all text-xs text-black/55">
                        {person.email}
                      </p>
                    </div>
                    <PermissionBadge role={person.role} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ams-copy text-sm text-black/55">
                Sin permisos asignados. Los delegados conservan el acceso por su
                rol general.
              </p>
            )}
          </div>
        ))}
      </section>

      {audit.length > 0 && (
        <section>
          <h3 className="mb-3 font-bold">Últimos cambios de permisos</h3>
          <ul className="ams-copy divide-y divide-black/10 text-sm">
            {audit.map((entry) => (
              <li key={entry.id} className="py-3">
                {entry.name ?? "Cuenta eliminada"} ·{" "}
                {entry.scope === "blog" ? "Blog" : "Cursos"} ·{" "}
                {roleLabel(entry.previousRole)} → {roleLabel(entry.nextRole)}
                <span className="ml-3 text-xs text-black/50">
                  {entry.createdAt.toLocaleDateString("es-MX", {
                    timeZone: "America/Mexico_City",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
