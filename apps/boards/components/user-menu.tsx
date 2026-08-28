"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

import type { User } from "@workspace/db/schema";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { signOutAction } from "@/app/_actions/auth";
import { getCalendarUrl } from "@/lib/urls";

export function UserMenu({ user }: { user: User }) {
  const [pending, startTransition] = useTransition();
  const calendarUrl = getCalendarUrl();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <Avatar className="size-7">
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback>{user.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{user.name}</span>
          {user.role === "delegate" && <Badge>Delegado</Badge>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={calendarUrl}>Ir al calendario</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await signOutAction();
            });
          }}
        >
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
