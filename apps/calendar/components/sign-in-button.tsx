"use client";

import { LogIn } from "lucide-react";
import { useSyncExternalStore } from "react";
import { DropdownMenuItem } from "@workspace/ui/components/dropdown-menu";

import { getCrossAppSignInUrl, getCalendarUrl } from "@/lib/urls";

function getSignInHref() {
  return getCrossAppSignInUrl(window.location.href);
}

function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  return getCrossAppSignInUrl(getCalendarUrl());
}

export function SignInButton() {
  const href = useSyncExternalStore(
    subscribe,
    getSignInHref,
    getServerSnapshot,
  );

  return (
    <DropdownMenuItem asChild>
      <a href={href}>
        <LogIn />
        <span>Iniciar sesión</span>
      </a>
    </DropdownMenuItem>
  );
}
