import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  MessageSquareText,
  Newspaper,
  ShieldCheck,
} from "lucide-react";

import { AccountSignIn } from "@/components/account-sign-in";
import { AccountSignOut } from "@/components/account-sign-out";
import { AccountConnections } from "@/components/account-connections";
import { getBlogUrl } from "@workspace/auth/urls";
import { db } from "@workspace/db";
import {
  account,
  blogStaff,
  courseStaff,
  user as userTable,
  userProfile,
  permissionAudit,
} from "@workspace/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import {
  ProfileForm,
  PermissionForm,
  PermissionBadge,
} from "@/components/profile-forms";
import { ProfileSecurity } from "@/components/profile-security";
import {
  canGrantPermission,
  roleLabel,
  type PermissionScope,
} from "@/lib/profile-permissions";
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { COURSES_URL } from "@/lib/content";
import { getBoardsUrl, getCalendarUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Mi perfil | Asociación Mexicana de Speedcubing",
  description:
    "Acceso con cuenta WCA y centro de acciones para competidores, delegados y editores de AMS.",
};

const myCompetitionsAction = {
  title: "Mis competencias",
  description:
    "Revisa solicitudes y seguimiento de competencias vinculadas a tu cuenta AMS.",
  href: `${getCalendarUrl()}/mis-competencias`,
  icon: CalendarDays,
};

const publicActions = [
  {
    title: "Comentar en el blog",
    description:
      "Lee publicaciones de AMS y participa con tu cuenta AMS o WCA.",
    href: getBlogUrl(),
    icon: MessageSquareText,
  },
  {
    title: "Tomar cursos",
    description:
      "Aprende con las lecciones y evaluaciones de AMS y conserva tu avance.",
    href: COURSES_URL,
    icon: GraduationCap,
  },
];

const delegateActions = [
  {
    title: "Panel de administración",
    description:
      "Edita delegados públicos, ubicaciones y contenido del sitio AMS.",
    href: "/admin",
    icon: Newspaper,
  },
  {
    title: "Crear competencias",
    description:
      "Abre el calendario de AMS para solicitar fechas, revisar procesos y administrar competencias.",
    href: `${getCalendarUrl()}/panel/competencias/nueva`,
    icon: ShieldCheck,
  },
  {
    title: "Tableros de organización",
    description:
      "Coordina tareas, checklist, comentarios y responsables para competencias asignadas.",
    href: getBoardsUrl(),
    icon: LayoutDashboard,
  },
  {
    title: "Crear cursos",
    description:
      "Entrada al LMS dedicado para administrar material de capacitación y rutas de aprendizaje.",
    href: COURSES_URL,
    icon: BookOpen,
  },
];

const editorActions = [
  {
    title: "Explorar Blog",
    description:
      "Lee las publicaciones de AMS. La gestión editorial tiene permisos propios, separados de Cursos.",
    href: getBlogUrl(),
    icon: Newspaper,
  },
];

export default function CuentaPage() {
  return (
    <main>
      <SiteNav />
      <PageHero
        eyebrow="Comunidad AMS"
        title="Mi perfil AMS"
        description="Tu información, tus vinculaciones y tus permisos. Un mismo perfil para toda la comunidad AMS."
      />
      <section className="bg-white py-16 md:py-20">
        <div className="ams-container max-w-280">
          <Suspense fallback={<CuentaBodyFallback />}>
            <CuentaBody />
          </Suspense>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

async function CuentaBody() {
  const requestHeaders = await headers();
  const session = process.env.BETTER_AUTH_SECRET
    ? await import("@/lib/auth").then(({ auth }) =>
        auth.api.getSession({
          headers: requestHeaders,
        }),
      )
    : null;
  const [currentMember] = session
    ? await db.select().from(userTable).where(eq(userTable.id, session.user.id))
    : [];
  const user = currentMember;
  const isDelegate = user?.role === "delegate";
  const isEditor = user?.role === "editor";
  const [blogPermission] = user
    ? await db.select().from(blogStaff).where(eq(blogStaff.userId, user.id))
    : [];
  const [coursePermission] = user
    ? await db.select().from(courseStaff).where(eq(courseStaff.userId, user.id))
    : [];
  const [wcaAccount] = user
    ? await db
        .select({ id: account.id })
        .from(account)
        .where(and(eq(account.userId, user.id), eq(account.providerId, "wca")))
    : [];
  const [profile] = user
    ? await db.select().from(userProfile).where(eq(userProfile.userId, user.id))
    : [];
  const [credential] = user
    ? await db
        .select({ id: account.id })
        .from(account)
        .where(
          and(
            eq(account.userId, user.id),
            eq(account.providerId, "credential"),
          ),
        )
    : [];
  const managedScopes: PermissionScope[] = user
    ? [
        ...(canGrantPermission(user.role, blogPermission?.role)
          ? ["blog" as const]
          : []),
        ...(canGrantPermission(user.role, coursePermission?.role)
          ? ["courses" as const]
          : []),
      ]
    : [];
  const audit = managedScopes.length
    ? await db
        .select({
          id: permissionAudit.id,
          scope: permissionAudit.scope,
          previousRole: permissionAudit.previousRole,
          nextRole: permissionAudit.nextRole,
          createdAt: permissionAudit.createdAt,
          name: userTable.name,
        })
        .from(permissionAudit)
        .leftJoin(userTable, eq(userTable.id, permissionAudit.targetId))
        .where(inArray(permissionAudit.scope, managedScopes))
        .orderBy(desc(permissionAudit.createdAt))
        .limit(10)
    : [];
  const blogTeam = managedScopes.includes("blog")
    ? await db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          role: blogStaff.role,
        })
        .from(blogStaff)
        .innerJoin(userTable, eq(userTable.id, blogStaff.userId))
        .orderBy(userTable.name)
        .limit(200)
    : [];
  const courseTeam = managedScopes.includes("courses")
    ? await db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          role: courseStaff.role,
        })
        .from(courseStaff)
        .innerJoin(userTable, eq(userTable.id, courseStaff.userId))
        .orderBy(userTable.name)
        .limit(200)
    : [];
  const scopedActions = [
    ...(isDelegate || blogPermission
      ? [
          {
            title: "Administrar Blog",
            description:
              "Crea entradas, organiza bloques y modera comentarios.",
            href: `${getBlogUrl()}/admin`,
            icon: Newspaper,
          },
        ]
      : []),
    ...(isDelegate || coursePermission
      ? [
          {
            title: "Administrar Cursos",
            description: "Crea cursos, lecciones y evaluaciones.",
            href: `${COURSES_URL}/admin`,
            icon: GraduationCap,
          },
        ]
      : []),
  ];
  const profileLevel = isDelegate
    ? "Delegado WCA"
    : [blogPermission?.role, coursePermission?.role].includes("developer")
      ? "Desarrollador"
      : [blogPermission?.role, coursePermission?.role].includes("administrator")
        ? "Administrador"
        : isEditor || blogPermission || coursePermission
          ? "Colaborador AMS"
          : user?.wcaId
            ? "Competidor"
            : "Miembro";
  const actions = [myCompetitionsAction, ...publicActions];

  return (
    <>
      {user ? (
        <div className="mb-10 flex flex-wrap items-center justify-between gap-5 rounded-5.5 bg-ams-soft p-6 md:p-8">
          <div className="flex items-center gap-4">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name}
                className="size-16 rounded-full object-cover"
              />
            ) : (
              <div className="ams-display flex size-16 items-center justify-center rounded-full bg-ams-navy text-xl text-white">
                {getInitials(user.name)}
              </div>
            )}
            <div>
              <p className="ams-heading text-sm font-bold uppercase tracking-[0.08em] text-ams-red">
                {profileLevel}
              </p>
              <h2 className="ams-display text-3xl leading-none text-ams-navy">
                {user.name}
              </h2>
              <p className="ams-heading mt-1 text-sm text-black/55">
                {user.wcaId ??
                  (wcaAccount
                    ? "Cuenta WCA vinculada; aún sin WCA ID."
                    : "Cuenta AMS · puedes vincular WCA más adelante.")}
              </p>
            </div>
          </div>
          <AccountSignOut />
        </div>
      ) : (
        <div className="ams-texture mb-10 overflow-hidden rounded-3xl bg-ams-navy p-8 text-white md:p-10">
          <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-ams-orange">
            Acceso único
          </p>
          <h2 className="ams-display max-w-2xl text-[clamp(2rem,5vw,3.5rem)] leading-none">
            Entra a la comunidad AMS
          </h2>
          <p className="ams-copy my-6 max-w-2xl text-base leading-7 text-white/75">
            Regístrate con correo o entra con WCA. Tu sesión se comparte entre
            la web, Cursos, Blog, Calendario y Tableros.
          </p>
          <AccountSignIn />
        </div>
      )}

      {user && (
        <>
          <nav
            aria-label="Secciones de mi perfil"
            className="mb-8 flex flex-wrap gap-3 ams-copy text-sm font-bold"
          >
            <a href="#datos" className="rounded-full bg-ams-soft px-5 py-3">
              Datos personales
            </a>
            <a
              href="#vinculaciones"
              className="rounded-full bg-ams-soft px-5 py-3"
            >
              Vinculaciones
            </a>
            <a href="#permisos" className="rounded-full bg-ams-soft px-5 py-3">
              Mi nivel y permisos
            </a>
            {managedScopes.length > 0 && (
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
                  La vinculación conserva tus cursos, comentarios y permisos. Tu
                  WCA ID se verifica con WCA.
                </p>
              </section>
              <section
                id="permisos"
                className="rounded-3xl bg-ams-soft p-6 scroll-mt-24"
              >
                <h2 className="ams-display mb-5 text-3xl">
                  Mi nivel y permisos
                </h2>
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
                          blogPermission?.role ??
                          (isDelegate ? "delegate" : null)
                        }
                      />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Cursos</dt>
                    <dd>
                      <PermissionBadge
                        role={
                          coursePermission?.role ??
                          (isDelegate ? "delegate" : null)
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
          {managedScopes.length > 0 && (
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
                          Sin permisos asignados. Los delegados conservan el
                          acceso por su rol general.
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
                  <h3 className="mb-3 font-bold">
                    Últimos cambios de permisos
                  </h3>
                  <ul className="ams-copy divide-y divide-black/10 text-sm">
                    {audit.map((entry) => (
                      <li key={entry.id} className="py-3">
                        {entry.name ?? "Cuenta eliminada"} ·{" "}
                        {entry.scope === "blog" ? "Blog" : "Cursos"} ·{" "}
                        {roleLabel(entry.previousRole)} →{" "}
                        {roleLabel(entry.nextRole)}
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
          )}
        </>
      )}
      {scopedActions.length > 0 && (
        <div className="mb-10 grid gap-6 lg:grid-cols-2">
          {scopedActions.map((action) => (
            <ActionCard key={action.title} action={action} />
          ))}
        </div>
      )}
      <div
        className={`grid gap-6 ${actions.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}
      >
        {actions.map((action) => (
          <ActionCard key={action.title} action={action} />
        ))}
      </div>

      {isDelegate || isEditor ? (
        <div className="mt-14">
          <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
            Permisos de organización
          </p>
          <h2 className="ams-display mb-6 text-[clamp(2rem,5vw,3.25rem)] leading-none">
            Herramientas para delegados y editores
          </h2>
          {isDelegate ? (
            <div className="grid gap-6 lg:grid-cols-4">
              {delegateActions.map((action) => (
                <ActionCard key={action.title} action={action} compact />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {editorActions.map((action) => (
                <ActionCard key={action.title} action={action} compact />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}

function CuentaBodyFallback() {
  return (
    <div className="space-y-10" aria-hidden>
      <div className="h-40 animate-pulse rounded-5.5 bg-ams-soft" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-48 animate-pulse rounded-5.5 bg-ams-soft" />
        <div className="h-48 animate-pulse rounded-5.5 bg-ams-soft" />
        <div className="h-48 animate-pulse rounded-5.5 bg-ams-soft" />
      </div>
    </div>
  );
}

function ActionCard({
  action,
  compact = false,
}: {
  action: {
    title: string;
    description: string;
    href: string;
    icon: typeof CalendarDays;
  };
  compact?: boolean;
}) {
  const Icon = action.icon;
  const external = action.href.startsWith("http");

  return (
    <a
      href={action.href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group block rounded-5.5 bg-ams-soft p-7 transition-transform hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(1,11,25,0.12)]"
    >
      <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-ams-red text-white transition-colors group-hover:bg-ams-green">
        <Icon className="size-5" />
      </div>
      <h3
        className={`ams-display leading-none text-ams-navy ${
          compact ? "text-2xl" : "text-3xl"
        }`}
      >
        {action.title}
      </h3>
      <p className="ams-copy mt-4 text-sm leading-6 text-black/65">
        {action.description}
      </p>
    </a>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
