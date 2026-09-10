"use client";

import { LogOut, UserCheck } from "lucide-react";
import { useTransition } from "react";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@workspace/ui/components/dropdown-menu";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import type { User } from "@workspace/db/schema";

import { signOutAction } from "@/app/_actions/auth";

export function UserDropdown({ user }: { user: User }) {
  const isMobile = useIsMobile();
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 focus:outline-none">
        <Avatar>
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <span>{user.name}</span>
        {user.role === "delegate" && <Badge>Delegado</Badge>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isMobile ? "center" : "end"}>
        <DropdownMenuItem>
          <UserCheck />
          <Link href="/mis-competencias" className="w-full">
            Mis competencias
          </Link>
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
