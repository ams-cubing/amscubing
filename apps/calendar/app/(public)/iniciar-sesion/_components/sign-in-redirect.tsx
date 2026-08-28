"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export function SignInRedirect({
  callbackURL,
}: {
  callbackURL: string;
}) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    void authClient.signIn.oauth2({
      providerId: "wca",
      callbackURL,
    }).catch(() => {
      toast.error("No se pudo iniciar sesión con WCA", {
        description: "Inténtalo de nuevo",
      });
    });
  }, [callbackURL]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <LoaderCircle className="size-8 animate-spin" />
      <p>Redirigiendo a WCA…</p>
    </div>
  );
}
