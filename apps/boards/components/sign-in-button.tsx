"use client";

import { LogIn } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@workspace/ui/components/button";

import { getCrossAppSignInUrl, getBoardsUrl } from "@/lib/urls";

function getSignInHref() {
  return getCrossAppSignInUrl(window.location.href);
}

function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  return getCrossAppSignInUrl(getBoardsUrl());
}

export function SignInButton() {
  const href = useSyncExternalStore(
    subscribe,
    getSignInHref,
    getServerSnapshot,
  );

  return (
    <Button asChild>
      <a href={href}>
        <LogIn className="size-4" />
        Iniciar sesión con WCA
      </a>
    </Button>
  );
}
