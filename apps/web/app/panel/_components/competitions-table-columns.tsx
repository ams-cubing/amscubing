/* eslint-disable react-hooks/rules-of-hooks */

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, CircleDashed, Ellipsis, MapPin, Text } from "lucide-react";
import * as React from "react";
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { competitions } from "@/db/schema";
import type { getCompetitions } from "../_lib/queries";

type CompetitionRow = Awaited<ReturnType<typeof getCompetitions>>["data"][number];

import { getStatusInternalIcon, getStatusPublicIcon } from "../_lib/utils";
import { AvatarGroup } from "@workspace/ui/components/avatar-group";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";
import { formatInternalStatus, formatPublicStatus, getInternalStatusColor, getPublicStatusColor } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UltimatumDialog } from "./ultimatum-dialog";

interface GetCompetitionsTableColumnsProps {
  stateCounts: Record<string, number>;
  statusPublicCounts: Record<CompetitionRow["statusPublic"], number>;
  statusInternalCounts: Record<CompetitionRow["statusInternal"], number>;
}

export function getCompetitionsTableColumns({
  stateCounts,
  statusPublicCounts,
  statusInternalCounts,
}: GetCompetitionsTableColumnsProps): ColumnDef<CompetitionRow>[] {
  return [
    {
      id: "startDate",
      accessorKey: "startDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Fecha inicio" />
      ),
      cell: ({ row }) => (
        <div className="font-mono">
          {new Date(row.original.startDate).toISOString().split("T")[0]}
        </div>
      ),
      // meta: {
      //   label: "Fecha de inicio",
      //   variant: "dateRange",
      //   icon: CalendarIcon,
      // },
      // enableColumnFilter: true,
    },
    {
      id: "endDate",
      accessorKey: "endDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Fecha fin" />
      ),
      cell: ({ row }) => (
        <div className="font-mono">
          {new Date(row.original.endDate).toISOString().split("T")[0]}
        </div>
      ),
      // meta: {
      //   label: "Fecha de finalización",
      //   variant: "dateRange",
      //   icon: CalendarIcon,
      // },
      // enableColumnFilter: true,
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Nombre" />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            {row.getValue("name") ? (
              <span className="max-w-125 truncate font-medium">
                {row.getValue("name")}
              </span>) : (
              <span className="text-muted-foreground text-sm">Sin nombre</span>
            )}
          </div>
        );
      },
      meta: {
        label: "Name",
        placeholder: "Buscar...",
        variant: "text",
        icon: Text,
      },
      enableColumnFilter: true,
    },
    {
      id: "state",
      accessorKey: "state",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Estado" />
      ),
      cell: ({ row }) => <div>{row.getValue("state") || ""}</div>,
      meta: {
        label: "Estado",
        variant: "multiSelect",
        options: Object.entries(stateCounts)
          .sort(([a], [b]) => a.localeCompare(b, "es"))
          .map(([state, count]) => ({
            label: state,
            value: state,
            count,
          })),
        icon: MapPin,
      },
      enableColumnFilter: true,
    },
    {
      id: "city",
      accessorKey: "city",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Ciudad" />
      ),
      cell: ({ row }) => <div>{row.getValue("city") || ""}</div>,
    },
    {
      id: "statusPublic",
      accessorKey: "statusPublic",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Estatus público" />
      ),
      cell: ({ cell }) => {
        const statusPublic = competitions.statusPublic.enumValues.find(
          (status) => status === cell.getValue<CompetitionRow["statusPublic"]>(),
        );

        if (!statusPublic) return null;

        const Icon = getStatusPublicIcon(statusPublic);

        return (
          <Badge variant="outline" className={cn("py-1 [&>svg]:size-3.5", getPublicStatusColor(statusPublic))}>
            <Icon />
            <span className="capitalize">{formatPublicStatus(statusPublic)}</span>
          </Badge>
        );
      },
      meta: {
        label: "Estatus Público",
        variant: "multiSelect",
        options: competitions.statusPublic.enumValues.map((status) => ({
          label: formatPublicStatus(status),
          value: status,
          count: statusPublicCounts[status],
          icon: getStatusPublicIcon(status),
        })),
        icon: CircleDashed,
      },
      enableColumnFilter: true,
    },
    {
      id: "statusInternal",
      accessorKey: "statusInternal",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Estatus interno" />
      ),
      cell: ({ cell }) => {
        const statusInternal = competitions.statusInternal.enumValues.find(
          (statusInternal) =>
            statusInternal === cell.getValue<CompetitionRow["statusInternal"]>(),
        );

        if (!statusInternal) return null;

        const Icon = getStatusInternalIcon(statusInternal);

        return (
          <Badge variant="outline" className={cn("py-1 [&>svg]:size-3.5", getInternalStatusColor(statusInternal))}>
            <Icon />
            <span className="capitalize">{formatInternalStatus(statusInternal)}</span>
          </Badge>
        );
      },
      meta: {
        label: "Estatus Interno",
        variant: "multiSelect",
        options: competitions.statusInternal.enumValues.map(
          (statusInternal) => ({
            label: formatInternalStatus(statusInternal),
            value: statusInternal,
            count: statusInternalCounts[statusInternal],
            icon: getStatusInternalIcon(statusInternal),
          }),
        ),
        icon: ArrowUpDown,
      },
      enableColumnFilter: true,
    },
    {
      id: "delegates",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Delegados" />
      ),
      accessorKey: "delegates",
      cell: ({ row }) => {
        const delegates = row.getValue("delegates") as
          {
            wcaId: string;
            name: string;
            image: string | null;
            isPrimary: boolean;
          }[]
          | undefined;
        if (!delegates || delegates.length === 0) {
          return (
            <span className="text-muted-foreground text-sm">Sin asignar</span>
          );
        }
        return (
          <AvatarGroup size={24}>
            {delegates
              .slice()
              .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
              .map((d) => (
                <Avatar
                  key={d.wcaId ?? d.name}
                  title={`${d.name}${d.isPrimary ? " (Principal)" : ""}`}
                >
                  <AvatarImage
                    src={d.image || undefined}
                    alt={d.name}
                  />
                  <AvatarFallback>
                    {d.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
          </AvatarGroup>
        );
      },
    },
    {
      accessorKey: "trelloAssignedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Trello asignado" />
      ),
      cell: ({ row }) => {
        const v = row.getValue("trelloAssignedAt") as string | null;
        if (!v) {
          return (
            <span className="text-muted-foreground text-sm">No asignado</span>
          );
        }
        const d = new Date(v);
        return <div className="font-mono">{d.toLocaleString()}</div>;
      },
    },
    {
      accessorKey: "ultimatumSetTo",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Ultimátum" />
      ),
      cell: ({ row }) => {
        const v = row.getValue("ultimatumSetTo") as string | null;
        if (!v) {
          return (
            <span className="text-muted-foreground text-sm">
              No establecido
            </span>
          );
        }
        const d = new Date(v);
        return <div className="font-mono">{d.toISOString().split("T")[0]}</div>;
      },
    },
    {
      accessorKey: "notes",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Notas" />
      ),
      cell: ({ row }) =>
        row.getValue("notes") ? (
          <span className="text-sm max-w-32 block truncate">
            {row.getValue("notes")}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">Sin notas</span>
        ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const router = useRouter();
        const [open, setOpen] = useState(false);

        const comp = row.original;

        return (
          <>
            <UltimatumDialog
              competitionId={comp.id}
              competitionLastDate={new Date(comp.endDate)}
              open={open}
              setOpen={setOpen}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Open menu"
                  variant="ghost"
                  className="flex size-8 p-0 data-[state=open]:bg-muted"
                >
                  <Ellipsis className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`/panel/competencias/${comp.id}`)}
                  >
                    Editar
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      setOpen(true);
                    }}
                    disabled={
                      comp.statusPublic === "announced" ||
                      comp.statusPublic === "suspended"
                    }
                  >
                    Enviar ultimátum
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        );
      },
      size: 40,
    },
  ];
}
