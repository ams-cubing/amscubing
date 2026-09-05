"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { authClient } from "@/lib/auth-client";

export function AccountSignOut() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
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
      className="ams-heading inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold text-[var(--ams-navy)] shadow-[0_10px_22px_rgba(1,11,25,0.08)] disabled:cursor-wait disabled:opacity-60"
    >
      <LogOut className="size-4" />
      {isPending ? "Cerrando..." : "Cerrar sesión"}
    </button>
  );
}
