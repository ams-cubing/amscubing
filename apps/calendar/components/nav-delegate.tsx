"use client";

import { type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import type { User } from "@workspace/db/schema";

export function NavDelegate({
  user,
  delegate,
}: {
  user: User | undefined;
  delegate: {
    name: string;
    url: string;
    icon: LucideIcon;
  }[];
}) {
  if (user?.role !== "delegate") {
    return null;
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Delegado</SidebarGroupLabel>
      <SidebarMenu>
        {delegate.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <a href={item.url}>
                <item.icon />
                <span>{item.name}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
