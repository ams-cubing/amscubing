"use client";

import { LogIn } from "lucide-react";
import { useSyncExternalStore } from "react";

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
    <a
      href={href}
      className="ams-glass inline-flex items-center justify-center gap-2 rounded-full border border-white/35 bg-[var(--ams-red)] px-6 py-4 font-bold text-white shadow-[0_8px_22px_rgba(186,12,47,0.25)] transition-transform hover:-translate-y-0.5"
    >
      <LogIn className="size-4" />
      Iniciar sesión con WCA ID
    </a>
  );
}
