import type { Metadata } from "next";
import { headers } from "next/headers";
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
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { CALENDAR_URL, COURSES_URL } from "@/lib/content";
import { getBoardsUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cuenta | Asociación Mexicana de Speedcubing",
  description:
    "Acceso con WCA ID y centro de acciones para competidores, delegados y editores de AMS.",
};

const publicActions = [
  {
    title: "Mis competencias",
    description:
      "Revisa solicitudes, registros y seguimiento de competencias vinculadas a tu WCA ID.",
    href: `${CALENDAR_URL}/mis-competencias`,
    icon: CalendarDays,
  },
  {
    title: "Comentar en el blog",
    description:
      "Lee publicaciones de AMS y participa con tu identidad WCA cuando el post acepte conversación.",
    href: "/blog",
    icon: MessageSquareText,
  },
  {
    title: "Tomar cursos",
    description:
      "Entra a la plataforma de cursos mientras el LMS dedicado se mantiene en su subdominio.",
    href: COURSES_URL,
    icon: GraduationCap,
  },
];

const delegateActions = [
  {
    title: "Crear competencias",
    description:
      "Abre el calendario de AMS para solicitar fechas, revisar procesos y administrar competencias.",
    href: `${CALENDAR_URL}/panel/competencias/nueva`,
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
    title: "Crear o responder blog",
    description:
      "Acceso editorial inicial para preparar publicaciones y moderar conversación pública.",
    href: "/blog",
    icon: Newspaper,
  },
  {
    title: "Crear cursos",
    description:
      "Entrada al LMS dedicado para administrar material de capacitación y rutas de aprendizaje.",
    href: COURSES_URL,
    icon: BookOpen,
  },
];

export default async function CuentaPage() {
  const requestHeaders = await headers();
  const session = process.env.BETTER_AUTH_SECRET
    ? await import("@/lib/auth").then(({ auth }) =>
        auth.api.getSession({
          headers: requestHeaders,
        }),
      )
    : null;
  const user = session?.user;
  const isDelegate = user?.role === "delegate";

  return (
    <main>
      <SiteNav />
      <PageHero
        eyebrow="WCA ID"
        title="Cuenta AMS"
        description="Inicia sesión con tu WCA ID para acceder a herramientas, cursos, blog y espacios de organización según tus permisos."
      />
      <section className="bg-white py-16 md:py-20">
        <div className="ams-container max-w-[1120px]">
          {user ? (
            <div className="mb-10 flex flex-wrap items-center justify-between gap-5 rounded-[22px] bg-[var(--ams-soft)] p-6 md:p-8">
              <div className="flex items-center gap-4">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt=""
                    className="size-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="ams-display flex size-16 items-center justify-center rounded-full bg-[var(--ams-navy)] text-xl text-white">
                    {getInitials(user.name)}
                  </div>
                )}
                <div>
                  <p className="ams-heading text-sm font-bold uppercase tracking-[0.08em] text-[var(--ams-red)]">
                    {isDelegate ? "Delegado WCA" : "Competidor"}
                  </p>
                  <h2 className="ams-display text-3xl leading-none text-[var(--ams-navy)]">
                    {user.name}
                  </h2>
                  <p className="ams-heading mt-1 text-sm text-black/55">
                    {user.wcaId}
                  </p>
                </div>
              </div>
              <AccountSignOut />
            </div>
          ) : (
            <div className="ams-texture mb-10 overflow-hidden rounded-[24px] bg-[var(--ams-navy)] p-8 text-white md:p-10">
              <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-[var(--ams-orange)]">
                Acceso único
              </p>
              <h2 className="ams-display max-w-2xl text-[clamp(2rem,5vw,3.5rem)] leading-none">
                Entra con tu WCA ID
              </h2>
              <p className="ams-copy my-6 max-w-2xl text-base leading-7 text-white/75">
                La sesión se comparte con calendario y tableros para que AMS
                pueda mostrarte acciones según tu rol.
              </p>
              <AccountSignIn />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {publicActions.map((action) => (
              <ActionCard key={action.title} action={action} />
            ))}
          </div>

          <div className="mt-14">
            <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-[var(--ams-red)]">
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
              <div className="rounded-[22px] border border-black/10 bg-white p-7 shadow-[0_14px_34px_rgba(1,11,25,0.08)]">
                <p className="ams-copy max-w-3xl text-base leading-7 text-black/65">
                  Estas acciones aparecen cuando tu WCA ID tiene permisos de
                  delegado. Más adelante se puede separar un rol editorial
                  específico para blog y cursos; por ahora el repositorio solo
                  distingue entre usuario y delegado.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
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
      className="group block rounded-[22px] bg-[var(--ams-soft)] p-7 transition-transform hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(1,11,25,0.12)]"
    >
      <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-[var(--ams-red)] text-white transition-colors group-hover:bg-[var(--ams-green)]">
        <Icon className="size-5" />
      </div>
      <h3
        className={`ams-display leading-none text-[var(--ams-navy)] ${
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
