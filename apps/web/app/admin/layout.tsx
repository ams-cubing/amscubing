import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";
import { unauthorized } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { auth } from "@/lib/auth";

async function AdminShell({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user || session.user.role !== "delegate") {
    unauthorized();
  }

  return (
    <>
      <SiteNav />
      <section className="border-b border-black/10 bg-ams-navy py-10 text-white">
        <div className="ams-container max-w-[1120px]">
          <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-ams-orange">
            Administración
          </p>
          <h1 className="ams-display text-[clamp(2rem,5vw,3.5rem)] leading-none">
            Panel AMS
          </h1>
          <p className="ams-copy mt-3 max-w-2xl text-base leading-7 text-white/75">
            Gestiona perfiles públicos de delegados, roles editoriales y la
            allowlist piloto de Tableros.
          </p>
          <nav className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin/delegados"
              className="ams-heading rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20"
            >
              Delegados
            </Link>
            <Link
              href="/admin/editores"
              className="ams-heading rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20"
            >
              Editores
            </Link>
            <Link
              href="/admin/tableros"
              className="ams-heading rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20"
            >
              Tableros
            </Link>
            <Link
              href="/cuenta"
              className="ams-heading rounded-full border border-transparent px-4 py-2 text-sm font-bold text-white/70 transition-colors hover:text-white"
            >
              Volver a cuenta
            </Link>
          </nav>
        </div>
      </section>
      <div className="ams-container max-w-[1120px] py-12 md:py-16">
        {children}
      </div>
      <SiteFooter />
    </>
  );
}

function AdminShellFallback() {
  return (
    <div className="ams-container max-w-[1120px] space-y-4 py-16" aria-hidden>
      <div className="h-8 w-64 animate-pulse rounded bg-ams-soft" />
      <div className="h-4 w-96 animate-pulse rounded bg-ams-soft" />
      <div className="h-64 w-full animate-pulse rounded-[22px] bg-ams-soft" />
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main>
      <Suspense fallback={<AdminShellFallback />}>
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </main>
  );
}
