"use client";

import { LogIn } from "lucide-react";
import { useSyncExternalStore } from "react";

import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

function subscribe() {
  return () => {};
}

/**
 * `href` is the server-built sign-in URL; on the client its `returnTo` is
 * replaced with the current page so the user lands back where they were.
 */
export function useSignInHref(href: string) {
  return useSyncExternalStore(
    subscribe,
    () => {
      const url = new URL(href);
      const here = window.location;
      if (url.origin === here.origin && url.pathname === here.pathname) {
        return href;
      }
      url.searchParams.set("returnTo", here.href);
      return url.toString();
    },
    () => href,
  );
}

export function AmsSignInLink({
  href,
  label = "Iniciar sesión",
  size = "lg",
  className,
}: {
  href: string;
  label?: string;
  size?: "default" | "lg";
  className?: string;
}) {
  const resolved = useSignInHref(href);

  return (
    <a
      href={resolved}
      className={cn(buttonVariants({ variant: "default", size }), className)}
    >
      <LogIn className="size-4" />
      {label}
    </a>
  );
}
