import Link from "next/link";

import { buttonVariants } from "@workspace/ui/components/button";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-[var(--ams-soft)] px-4 py-16">
      <div className="max-w-lg rounded-[24px] bg-white p-8 text-center shadow-[0_14px_34px_rgba(1,11,25,0.08)] md:p-10">
        <p className="ams-heading text-sm font-bold uppercase tracking-[0.12em] text-[var(--ams-red)]">
          401
        </p>
        <h1 className="ams-display mt-3 text-4xl leading-none text-[var(--ams-navy)]">
          No autorizado
        </h1>
        <p className="ams-copy mt-4 text-base leading-7 text-black/65">
          Esta sección es solo para delegados. Inicia sesión con un WCA ID con
          permisos de delegado para continuar.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/cuenta"
            className={buttonVariants({ variant: "default", size: "lg" })}
          >
            Ir a cuenta
          </Link>
          <Link
            href="/"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
