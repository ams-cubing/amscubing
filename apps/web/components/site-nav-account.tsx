"use client";

import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";

import { authClient } from "@/lib/auth-client";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function SiteNavAccount() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  if (isPending) {
    return (
      <div
        className="size-10 animate-pulse rounded-full bg-white/15"
        aria-hidden
      />
    );
  }

  if (user) {
    return (
      <Link
        href="/cuenta"
        aria-label={`Cuenta de ${user.name}`}
        className="inline-flex rounded-full ring-2 ring-white/25 transition hover:ring-ams-orange"
      >
        <Avatar className="size-10 border border-white/20">
          <AvatarImage src={user.image ?? undefined} alt="" />
          <AvatarFallback className="bg-ams-red text-sm font-bold text-white">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      </Link>
    );
  }

  return (
    <Button
      asChild
      variant="destructive"
      className="ams-glass border border-white/25"
    >
      <Link href="/cuenta">Iniciar sesión</Link>
    </Button>
  );
}
