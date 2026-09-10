"use client";

import { LogIn } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@workspace/ui/components/button";

import { getCrossAppSignInUrl, getWebUrl } from "@/lib/urls";

function subscribe() {
  return () => {};
}

function getSignInHref() {
  return getCrossAppSignInUrl(`${window.location.origin}/cuenta`);
}

function getServerSnapshot() {
  return getCrossAppSignInUrl(`${getWebUrl()}/cuenta`);
}

export function AccountSignIn() {
  const href = useSyncExternalStore(
    subscribe,
    getSignInHref,
    getServerSnapshot,
  );

  return (
    <Button
      asChild
      size="lg"
      variant="destructive"
      className="ams-glass border border-white/35"
    >
      <a href={href}>
        <LogIn className="size-4" />
        Iniciar sesión con WCA ID
      </a>
    </Button>
  );
}
