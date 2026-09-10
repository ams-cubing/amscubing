"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@workspace/ui/components/button";

import { authClient } from "@/lib/auth-client";

export function AccountSignOut() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await authClient.signOut({
            fetchOptions: {
              onSuccess: () => {
                window.location.href = "/cuenta";
              },
            },
          });
        });
      }}
    >
      <LogOut className="size-4" />
      {isPending ? "Cerrando..." : "Cerrar sesión"}
    </Button>
  );
}
