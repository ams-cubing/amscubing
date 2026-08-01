"use client";

import { Trophy, type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import type { User } from "better-auth";

export function NavCalendar({
  user,
  calendar,
}: {
  user: User | undefined;
  calendar: {
    name: string;
    url: string;
    icon: LucideIcon;
  }[];
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Calendario</SidebarGroupLabel>
      <SidebarMenu>
        {calendar.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <a href={item.url}>
                <item.icon />
                <span>{item.name}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        {user && (
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/mis-competencias">
                <Trophy />
                <span>Mis competencias</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
