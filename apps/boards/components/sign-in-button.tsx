"use client";

import { LoaderCircle, LogIn } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@workspace/ui/components/button";

import { authClient } from "@/lib/auth-client";

export function SignInButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await authClient.signIn.oauth2({
              providerId: "wca",
              callbackURL: "/",
            });
          } catch (error) {
            if (error instanceof z.ZodError) {
              toast.error("No se pudo iniciar sesión con WCA");
            }
          }
        });
      }}
    >
      {pending ? (
        <LoaderCircle className="animate-spin" />
      ) : (
        <LogIn className="size-4" />
      )}
      Iniciar sesión con WCA
    </Button>
  );
}
