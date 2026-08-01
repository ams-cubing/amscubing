"use client";

import { LoaderCircle, LogIn } from "lucide-react";
import { DropdownMenuItem } from "@workspace/ui/components/dropdown-menu";
import { useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import z from "zod";

export function SignInButton() {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenuItem
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
              console.error(error);
              toast.error("Failed to sign in with WCA", {
                description: "Please try again",
              });
            }
          }
        });
      }}
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <LogIn />}
      <span>Iniciar sesión</span>
    </DropdownMenuItem>
  );
}
