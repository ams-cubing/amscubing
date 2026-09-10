"use client";

import { useTransition, type ReactNode } from "react";
import {
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  UserRound,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

export type AmsAccountUser = {
  name: string;
  image?: string | null;
  email?: string | null;
};

export type AmsAccountMenuUrls = {
  webUrl: string;
  calendarUrl: string;
  boardsUrl: string;
  coursesUrl: string;
  signInHref: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function joinUrl(base: string, path = "") {
  const normalized = base.replace(/\/$/, "");
  if (!path || path === "/") return normalized;
  return `${normalized}${path.startsWith("/") ? path : `/${path}`}`;
}

export function AmsAccountMenu({
  user,
  isPending = false,
  urls,
  showBoardsLink = false,
  onSignOut,
  extraItems,
}: {
  user: AmsAccountUser | null | undefined;
  isPending?: boolean;
  urls: AmsAccountMenuUrls;
  showBoardsLink?: boolean;
  onSignOut?: () => void | Promise<void>;
  extraItems?: ReactNode;
}) {
  const [signingOut, startTransition] = useTransition();

  if (isPending) {
    return (
      <div
        className="size-10 animate-pulse rounded-full bg-white/15"
        aria-hidden
      />
    );
  }

  if (!user) {
    return (
      <Button
        asChild
        variant="destructive"
        className="ams-glass border border-white/25"
      >
        <a href={urls.signInHref}>Iniciar sesión</a>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Cuenta de ${user.name}`}
          className="inline-flex rounded-full ring-2 ring-white/25 transition hover:ring-ams-orange focus-visible:outline-none focus-visible:ring-ams-orange"
        >
          <Avatar className="size-10 border border-white/20">
            <AvatarImage src={user.image ?? undefined} alt="" />
            <AvatarFallback className="bg-ams-red text-sm font-bold text-white">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-semibold">{user.name}</span>
            {user.email ? (
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={joinUrl(urls.webUrl, "/cuenta")}>
            <UserRound />
            Cuenta
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={urls.calendarUrl}>
            <CalendarDays />
            Calendario
          </a>
        </DropdownMenuItem>
        {showBoardsLink ? (
          <DropdownMenuItem asChild>
            <a href={urls.boardsUrl}>
              <LayoutDashboard />
              Tableros
            </a>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <a href={urls.coursesUrl} target="_blank" rel="noopener noreferrer">
            <GraduationCap />
            Cursos
          </a>
        </DropdownMenuItem>
        {extraItems}
        {onSignOut ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={signingOut}
              onClick={() => {
                startTransition(async () => {
                  await onSignOut();
                });
              }}
            >
              <LogOut />
              {signingOut ? "Cerrando..." : "Cerrar sesión"}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
