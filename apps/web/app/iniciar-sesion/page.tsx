import { isAllowedReturnTo } from "@workspace/auth/urls";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { isAuthDatabaseReady } from "@/lib/auth-readiness";

import { SignInRedirect } from "./_components/sign-in-redirect";

export const metadata: Metadata = {
  title: "Iniciar sesión | Asociación Mexicana de Speedcubing",
  description: "Acceso con WCA ID para la cuenta AMS.",
};

export default async function IniciarSesionPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const callbackURL =
    returnTo && isAllowedReturnTo(returnTo) ? returnTo : "/cuenta";
  const hasWcaConfig = Boolean(
    process.env.WCA_CLIENT_ID && process.env.WCA_CLIENT_SECRET,
  );
  const databaseReady = hasWcaConfig ? await isAuthDatabaseReady() : false;

  if (hasWcaConfig && databaseReady) {
    return <SignInRedirect callbackURL={callbackURL} />;
  }

  const missingMessage = hasWcaConfig
    ? "Las credenciales de WCA ya están cargadas, pero PostgreSQL local no está corriendo. Better Auth necesita la base para guardar el estado temporal del login."
    : "El sitio ya tiene el flujo de cuenta listo, pero faltan las credenciales OAuth de WCA en el entorno local.";

  return (
    <main>
      <SiteNav />
      <PageHero
        eyebrow="WCA ID"
        title="Iniciar sesión"
        description={missingMessage}
      />
      <section className="bg-white py-16 md:py-20">
        <div className="ams-container max-w-3xl">
          <div className="rounded-[24px] bg-[var(--ams-soft)] p-8 md:p-10">
            <h2 className="ams-display text-3xl leading-none text-[var(--ams-navy)]">
              {hasWcaConfig
                ? "Base local no disponible"
                : "Configuración pendiente"}
            </h2>
            <p className="ams-copy mt-5 text-base leading-7 text-black/70">
              {hasWcaConfig
                ? "Arranca PostgreSQL y corre las migraciones antes de intentar entrar con WCA. El proyecto espera una base en postgresql://ams:ams@localhost:5432/amscubing."
                : "Para probar login en localhost, configura `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `WCA_CLIENT_ID` y `WCA_CLIENT_SECRET` en `apps/web/.env.local`. El redirect URI registrado en WCA debe ser `http://localhost:3000/api/auth/callback/wca`."}
            </p>
            <Link
              href="/cuenta"
              className="ams-heading mt-7 inline-flex rounded-full bg-[var(--ams-red)] px-6 py-4 text-sm font-bold text-white"
            >
              Volver a cuenta
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
