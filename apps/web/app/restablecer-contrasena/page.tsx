import { ResetForm } from "./reset-form";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Suspense } from "react";
export default function Page(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="ams-container py-20" aria-busy="true">
          Cargando…
        </main>
      }
    >
      <ResetPage {...props} />
    </Suspense>
  );
}
async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main>
      <SiteNav />
      <section className="ams-container max-w-xl py-20">
        <h1 className="ams-display text-4xl text-ams-navy">
          Restablecer contraseña
        </h1>
        <ResetForm token={token ?? ""} />
      </section>
      <SiteFooter />
    </main>
  );
}
