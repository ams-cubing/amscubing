/* eslint-disable react-hooks/rules-of-hooks */

"use client";

import * as React from "react";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  PlusCircle,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { AvatarGroup } from "@workspace/ui/components/avatar-group";
import {
  getPublicStatusColor,
  formatPublicStatus,
  formatInternalStatus,
  getInternalStatusColor,
} from "@/lib/utils";
import { cn } from "@workspace/ui/lib/utils";
import type {
  CompetitionDelegate,
  Competition as CompetitionType,
  Region,
  State,
  User,
} from "@workspace/db/schema";
import Link from "next/link";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
} from "@workspace/ui/components/dropdown-menu";
import { UltimatumDialog } from "./ultimatum-dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@workspace/ui/components/select";

type Delegates = CompetitionDelegate & {
  delegate: User;
};

type Competition = CompetitionType & {
  state: State & {
    region: Region;
  };
  delegates: Delegates[];
};

export const columns: ColumnDef<Competition>[] = [
  {
    id: "startDate",
    accessorKey: "startDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Fecha Inicio <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-mono">
        {new Date(row.original.startDate).toISOString().split("T")[0]}
      </div>
    ),
  },
  {
    id: "endDate",
    accessorKey: "endDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Fecha Fin <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-mono">
        {new Date(row.original.endDate).toISOString().split("T")[0]}
      </div>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Nombre <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue("name") || "Sin nombre"}</div>,
  },
  {
    id: "state",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Estado <ArrowUpDown />
      </Button>
    ),
    accessorFn: (row) => row.state?.name,
    cell: ({ row }) => <div>{row.getValue("state") || ""}</div>,
  },
  {
    accessorKey: "city",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Ciudad <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue("city") || ""}</div>,
  },
  {
    accessorKey: "statusPublic",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Estado Público <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => {
      const v = row.getValue("statusPublic") as
        | CompetitionType["statusPublic"]
        | undefined;
      return (
        <span
          className={cn("text-xs px-2 py-1 rounded", getPublicStatusColor(v!))}
        >
          {formatPublicStatus(v!)}
        </span>
      );
    },
  },
  {
    accessorKey: "statusInternal",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Estado Interno <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => {
      const v = row.getValue("statusInternal") as
        | CompetitionType["statusInternal"]
        | undefined;
      return (
        <span
          className={cn(
            "text-xs px-2 py-1 rounded",
            getInternalStatusColor(v!),
          )}
        >
          {formatInternalStatus(v!)}
        </span>
      );
    },
  },
  {
    id: "delegates",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Delegados <ArrowUpDown />
      </Button>
    ),
    accessorKey: "delegates",
    cell: ({ row }) => {
      const delegates = row.getValue("delegates") as Delegates[] | undefined;
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
                key={d.delegateWcaId ?? d.delegate.name}
                title={`${d.delegate.name}${d.isPrimary ? " (Principal)" : ""}`}
              >
                <AvatarImage
                  src={d.delegate.image || undefined}
                  alt={d.delegate.name}
                />
                <AvatarFallback>
                  {d.delegate.name
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
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Trello Asignado <ArrowUpDown />
      </Button>
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
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Ultimátum <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => {
      const v = row.getValue("ultimatumSetTo") as string | null;
      if (!v) {
        return (
          <span className="text-muted-foreground text-sm">No establecido</span>
        );
      }
      const d = new Date(v);
      return <div className="font-mono">{d.toISOString().split("T")[0]}</div>;
    },
  },
  {
    accessorKey: "notes",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Notas <ArrowUpDown />
      </Button>
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
    enableHiding: false,
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
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal />
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
  },
];

export function DataTable({ data }: { data: Competition[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const isMobile = useIsMobile();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4 gap-2">
        <Input
          placeholder="Filtrar por nombre..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />

        <Link
          href="/panel/competencias/nueva"
          className={buttonVariants({
            variant: "default",
            size: isMobile ? "icon" : "default",
          })}
        >
          <PlusCircle size={18} />
          {isMobile ? null : <span>Nueva Competencia</span>}
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No hay competencias disponibles.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2 pt-6">
        <div />
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Filas por página</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-17.5">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 25, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-25 items-center justify-center text-sm font-medium">
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              className="hidden size-8 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Ir a la primera página</span>
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Ir a la página anterior</span>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Ir a la página siguiente</span>
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden size-8 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Ir a la última página</span>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
