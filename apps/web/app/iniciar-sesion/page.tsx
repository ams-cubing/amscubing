import { isAllowedReturnTo } from "@workspace/auth/urls";
import { PageHero } from "@/components/page-hero";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { LoginForm, type LoginMode } from "./_components/login-form";
import { Suspense } from "react";
export const metadata = {
  title: "Iniciar sesión | AMS",
  description: "Acceso con correo o cuenta WCA a la comunidad AMS.",
};

type SearchParams = Promise<{
  returnTo?: string;
  error?: string;
  modo?: string;
}>;

const ERROR_MESSAGES: Record<string, string> = {
  account_already_linked_to_different_user:
    "Esa cuenta WCA ya está vinculada a otra cuenta AMS. Inicia sesión con esa cuenta o contacta a AMS para unificarlas.",
  "email_doesn't_match":
    "El correo de tu cuenta WCA no coincide con tu cuenta AMS. Inicia sesión con correo y vincula WCA desde tu perfil.",
  unable_to_link_account:
    "No se pudo vincular la cuenta WCA. Inténtalo de nuevo desde tu perfil.",
  access_denied:
    "Cancelaste el acceso con WCA. Puedes intentarlo de nuevo o usar tu correo.",
  state_mismatch:
    "La sesión de acceso expiró. Vuelve a intentarlo desde esta página.",
  please_restart_the_process:
    "La sesión de acceso expiró. Vuelve a intentarlo desde esta página.",
  invalid_token:
    "El enlace ya no es válido. Solicita uno nuevo desde tu perfil.",
  token_expired: "El enlace expiró. Solicita uno nuevo desde tu perfil.",
};

const GENERIC_ERROR =
  "No se pudo completar el acceso o la vinculación. Verifica tu correo AMS y comprueba que WCA no esté vinculada a otra cuenta.";

export default function Page(props: { searchParams: SearchParams }) {
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
async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { returnTo, error, modo } = await searchParams;
  const callbackURL =
    returnTo && isAllowedReturnTo(returnTo) ? returnTo : "/cuenta";
  const initialMode: LoginMode = modo === "registro" ? "register" : "login";
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
            <p role="alert" className="ams-copy mb-5 text-ams-red">
              {ERROR_MESSAGES[error] ?? GENERIC_ERROR}
            </p>
          )}
          <LoginForm
            callbackURL={callbackURL}
            initialMode={initialMode}
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
