import { PermissionBadge, PermissionForm } from "@/components/profile-forms";
import { roleLabel, type PermissionScope } from "@/lib/profile-permissions";

import type { PermissionAuditEntry, TeamMember } from "../_lib/account-data";

export function PermissionManagement({
  managedScopes,
  blogTeam,
  courseTeam,
  audit,
  isDelegate,
}: {
  managedScopes: PermissionScope[];
  blogTeam: TeamMember[];
  courseTeam: TeamMember[];
  audit: PermissionAuditEntry[];
  isDelegate: boolean;
}) {
  return (
    <section
      id="gestion"
      className="mb-10 rounded-3xl border border-black/10 p-6 md:p-8 scroll-mt-24"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-ams-red">
        Equipo AMS
      </p>
      <h2 className="ams-display my-3 text-3xl">Gestionar permisos</h2>
      <p className="ams-copy mb-6 text-sm text-black/60">
        Puedes gestionar:{" "}
        {managedScopes
          .map((scope) => (scope === "blog" ? "Blog" : "Cursos"))
          .join(" y ")}
        .
      </p>
      <PermissionForm scopes={managedScopes} />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {[
          {
            scope: "blog" as const,
            title: "Equipo de Blog",
            rows: blogTeam,
          },
          {
            scope: "courses" as const,
            title: "Equipo de Cursos",
            rows: courseTeam,
          },
        ]
          .filter((team) => managedScopes.includes(team.scope))
          .map((team) => (
            <section key={team.scope}>
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
                  Sin permisos asignados. Los delegados conservan el acceso por
                  su rol general.
                </p>
              )}
            </section>
          ))}
      </div>
      {isDelegate && (
        <a
          href="/admin"
          className="mt-6 inline-block text-sm font-bold text-ams-red underline"
        >
          Gestionar delegados y editores de la Web ↗
        </a>
      )}
      {audit.length > 0 && (
        <div className="mt-8">
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
        </div>
      )}
    </section>
  );
}
