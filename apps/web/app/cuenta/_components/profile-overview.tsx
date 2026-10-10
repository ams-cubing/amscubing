import { AccountConnections } from "@/components/account-connections";
import { PermissionBadge, ProfileForm } from "@/components/profile-forms";
import { ProfileSecurity } from "@/components/profile-security";

import type { AccountData, AccountUser } from "../_lib/account-data";

export function ProfileOverview({
  user,
  data,
}: {
  user: AccountUser;
  data: AccountData;
}) {
  const { blogPermission, coursePermission, wcaAccount, profile, credential } =
    data;
  const isDelegate = user.role === "delegate";
  const isEditor = user.role === "editor";

  return (
    <>
      <nav
        aria-label="Secciones de mi perfil"
        className="mb-8 flex flex-wrap gap-3 ams-copy text-sm font-bold"
      >
        <a href="#datos" className="rounded-full bg-ams-soft px-5 py-3">
          Datos personales
        </a>
        <a href="#vinculaciones" className="rounded-full bg-ams-soft px-5 py-3">
          Vinculaciones
        </a>
        <a href="#permisos" className="rounded-full bg-ams-soft px-5 py-3">
          Mi nivel y permisos
        </a>
        {data.managedScopes.length > 0 && (
          <a
            href="#gestion"
            className="rounded-full bg-ams-red px-5 py-3 text-white"
          >
            Gestionar permisos
          </a>
        )}
      </nav>
      <div className="mb-10 grid items-start gap-8 lg:grid-cols-2">
        <section
          id="datos"
          className="rounded-3xl border border-black/10 p-6 md:p-8 scroll-mt-24"
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ams-red">
            Tu información
          </p>
          <h2 className="ams-display mb-6 text-3xl">Datos personales</h2>
          <ProfileForm
            name={user.name}
            email={user.email}
            city={profile?.city ?? ""}
            biography={profile?.biography ?? ""}
          />
        </section>
        <div className="space-y-8">
          <section
            id="vinculaciones"
            className="rounded-3xl bg-ams-navy p-6 text-white scroll-mt-24"
          >
            <h2 className="ams-display text-3xl">Acceso y vinculaciones</h2>
            <AccountConnections
              verified={user.emailVerified}
              linked={Boolean(wcaAccount)}
            />
            {user.wcaId && (
              <a
                className="mt-4 inline-block text-sm underline"
                href={`https://www.worldcubeassociation.org/persons/${encodeURIComponent(user.wcaId)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver perfil WCA · {user.wcaId} ↗
              </a>
            )}
            <p className="ams-copy mt-4 text-xs leading-5 text-white/70">
              La vinculación conserva tus cursos, comentarios y permisos. Tu WCA
              ID se verifica con WCA.
            </p>
          </section>
          <section
            id="permisos"
            className="rounded-3xl bg-ams-soft p-6 scroll-mt-24"
          >
            <h2 className="ams-display mb-5 text-3xl">Mi nivel y permisos</h2>
            <dl className="ams-copy space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Perfil general</dt>
                <dd>
                  <PermissionBadge role={user.role} />
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Blog</dt>
                <dd>
                  <PermissionBadge
                    role={
                      blogPermission?.role ?? (isDelegate ? "delegate" : null)
                    }
                  />
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Cursos</dt>
                <dd>
                  <PermissionBadge
                    role={
                      coursePermission?.role ?? (isDelegate ? "delegate" : null)
                    }
                  />
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Web</dt>
                <dd>
                  {isDelegate
                    ? "Administración"
                    : isEditor
                      ? "Editorial"
                      : "Comunidad"}
                </dd>
              </div>
              <div>
                <dt className="font-bold">Calendario y Tableros</dt>
                <dd className="mt-1 text-black/60">
                  {isDelegate
                    ? "Herramientas de delegado y competencias asignadas."
                    : "Solicitudes y organización de las competencias en las que participas."}
                </dd>
              </div>
            </dl>
            <p className="ams-copy mt-5 text-xs leading-5 text-black/60">
              Tu nivel resume tu participación. Los permisos se conceden por
              aplicación; ser editor de Blog no da acceso a la gestión de
              Cursos.
            </p>
          </section>
          <ProfileSecurity
            credential={Boolean(credential)}
            linked={Boolean(wcaAccount)}
            verified={user.emailVerified}
          />
        </div>
      </div>
    </>
  );
}
