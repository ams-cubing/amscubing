"use client";

import { LogIn } from "lucide-react";
import { useSyncExternalStore } from "react";

import { buttonVariants } from "@workspace/ui/components/button";

import { getCalendarUrl, getCrossAppSignInUrl } from "@/lib/urls";

function getSignInHref() {
  return getCrossAppSignInUrl(window.location.href);
}

function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  return getCrossAppSignInUrl(getCalendarUrl());
}

export function ReturnSignInLink() {
  const href = useSyncExternalStore(
    subscribe,
    getSignInHref,
    getServerSnapshot,
  );

  return (
    <a
      href={href}
      className={buttonVariants({ variant: "default", size: "lg" })}
    >
      <LogIn className="size-4" />
      Iniciar sesión
    </a>
  );
}
