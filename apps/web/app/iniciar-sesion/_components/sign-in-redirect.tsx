"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@workspace/ui/components/button";

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
        <p className="ams-heading text-sm font-bold uppercase tracking-[0.08em] text-ams-red">
          No se pudo iniciar sesión
        </p>
        <p className="ams-copy max-w-xl text-base leading-7 text-black/65">
          El flujo de WCA está configurado, pero el servidor local no pudo
          guardar el estado temporal del acceso. Revisa que PostgreSQL esté
          corriendo antes de intentar de nuevo.
        </p>
        <Button asChild size="lg" variant="brand">
          <Link href="/cuenta">Volver a cuenta</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="ams-container flex min-h-[52vh] flex-col items-center justify-center gap-4 text-center">
      <LoaderCircle className="size-9 animate-spin text-ams-red" />
      <p className="ams-heading text-sm font-bold uppercase tracking-[0.08em] text-ams-navy">
        Redirigiendo a WCA
      </p>
    </div>
  );
}
