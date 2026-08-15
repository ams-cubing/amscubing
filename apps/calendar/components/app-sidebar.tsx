"use client";

import * as React from "react";
import {
  Home,
  CalendarPlus,
  Map,
  UserIcon,
  PlusCircle,
  CalendarCheck,
  Activity,
  LayoutDashboard,
} from "lucide-react";

import { NavCalendar } from "@/components/nav-calendar";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import Image from "next/image";
import { NavDelegate } from "./nav-delegate";
import type { User } from "@workspace/db/schema";
import { getBoardsUrl, isBoardsEnabled } from "@/lib/boards";

const data = {
  calendar: [
    {
      name: "Inicio",
      url: "/",
      icon: Home,
    },
    {
      name: "Regiones",
      url: "/regiones",
      icon: Map,
    },
    {
      name: "Solicitar fecha",
      url: "/solicitar-fecha",
      icon: CalendarPlus,
    },
  ],
  delegate: [
    {
      name: "Panel de delegado",
      url: "/panel",
      icon: UserIcon,
    },
    {
      name: "Nueva competencia",
      url: "/panel/competencias/nueva",
      icon: PlusCircle,
    },
    {
      name: "Disponibilidad",
      url: "/panel/disponibilidad",
      icon: CalendarCheck,
    },
    {
      name: "Actividad",
      url: "/panel/actividad",
      icon: Activity,
    },
  ],
};

export function AppSidebar({
  user,
  ...props
}: {
  user: User | undefined;
} & React.ComponentProps<typeof Sidebar>) {
  const calendarNav = isBoardsEnabled()
    ? [
        ...data.calendar,
        {
          name: "Tableros AMS",
          url: getBoardsUrl(),
          icon: LayoutDashboard,
        },
      ]
    : data.calendar;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="https://amscubing.org/">
                <div className="bg-primary flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image src="/icon.png" alt="Logo" width={24} height={24} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    Asociación Mexicana de Speedcubing
                  </span>
                  <span className="truncate text-xs">Calendario público</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavCalendar calendar={calendarNav} user={user} />
        <NavDelegate delegate={data.delegate} user={user} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
