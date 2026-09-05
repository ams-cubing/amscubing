"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function SignInRedirect({ callbackURL }: { callbackURL: string }) {
  const started = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    void authClient.signIn
      .oauth2({
        providerId: "wca",
        callbackURL,
      })
      .catch(() => {
        setError(true);
      });
  }, [callbackURL]);

  if (error) {
    return (
      <div className="ams-container flex min-h-[52vh] flex-col items-center justify-center gap-4 text-center">
        <p className="ams-heading text-sm font-bold uppercase tracking-[0.08em] text-[var(--ams-red)]">
          No se pudo iniciar sesión
        </p>
        <p className="ams-copy max-w-xl text-base leading-7 text-black/65">
          El flujo de WCA está configurado, pero el servidor local no pudo
          guardar el estado temporal del acceso. Revisa que PostgreSQL esté
          corriendo antes de intentar de nuevo.
        </p>
        <a
          href="/cuenta"
          className="ams-heading rounded-full bg-[var(--ams-navy)] px-6 py-4 text-sm font-bold text-white"
        >
          Volver a cuenta
        </a>
      </div>
    );
  }

  return (
    <div className="ams-container flex min-h-[52vh] flex-col items-center justify-center gap-4 text-center">
      <LoaderCircle className="size-9 animate-spin text-[var(--ams-red)]" />
      <p className="ams-heading text-sm font-bold uppercase tracking-[0.08em] text-[var(--ams-navy)]">
        Redirigiendo a WCA
      </p>
    </div>
  );
}
