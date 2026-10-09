import { isAllowedReturnTo } from "@workspace/auth/urls";
import { PageHero } from "@/components/page-hero";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { LoginForm } from "./_components/login-form";
import { Suspense } from "react";
export const metadata = {
  title: "Iniciar sesión | AMS",
  description: "Acceso con correo o cuenta WCA a la comunidad AMS.",
};
export default function Page(props: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="ams-container py-20" aria-busy="true">
          Cargando acceso…
        </main>
      }
    >
      <LoginPage {...props} />
    </Suspense>
  );
}
async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const { returnTo, error } = await searchParams;
  const callbackURL =
    returnTo && isAllowedReturnTo(returnTo) ? returnTo : "/cuenta";
  return (
    <main>
      <SiteNav />
      <PageHero
        eyebrow="COMUNIDAD AMS"
        title="Tu cuenta AMS"
        description="Toma cursos y participa en el blog con una cuenta de correo o WCA. Puedes vincular WCA más adelante sin perder tu historial."
      />
      <section className="bg-white py-16">
        <div className="ams-container max-w-2xl">
          {error && (
            <p className="ams-copy mb-5 text-ams-red">
              No se pudo completar el acceso o la vinculación. Verifica tu
              correo AMS y comprueba que WCA no esté vinculada a otra cuenta.
            </p>
          )}
          <LoginForm
            callbackURL={callbackURL}
            wcaEnabled={Boolean(
              process.env.WCA_CLIENT_ID && process.env.WCA_CLIENT_SECRET,
            )}
          />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
