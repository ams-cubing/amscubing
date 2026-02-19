"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
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
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

type DelegateAvailability = {
  wcaId: string;
  name: string;
  regionId: string | null;
  region: {
    displayName: string;
  } | null;
  availability: {
    date: string;
  }[];
};

type TableRow = {
  delegateName: string;
  delegateWcaId: string;
  regionName: string;
  availabilityDates: Set<string>;
};

interface AvailabilityCalendarTableProps {
  delegates: DelegateAvailability[];
}

// Helper function to parse date strings in local timezone
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year!, month! - 1, day);
}

export function AvailabilityCalendarTable({
  delegates,
}: AvailabilityCalendarTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [datePage, setDatePage] = React.useState(0);
  const datesPerPage = 10;

  // Get all unique dates and sort them
  const allDates = React.useMemo(() => {
    const dateSet = new Set<string>();
    delegates.forEach((delegate) => {
      delegate.availability.forEach((avail) => {
        dateSet.add(avail.date);
      });
    });
    return Array.from(dateSet).sort();
  }, [delegates]);

  // Filter dates from 5 weeks ahead onwards
  const availableDates = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fiveWeeksFromNow = new Date(today);
    fiveWeeksFromNow.setDate(today.getDate() + 35);

    return allDates.filter((dateStr) => {
      const date = parseLocalDate(dateStr);
      return date >= fiveWeeksFromNow;
    });
  }, [allDates]);

  // Paginate dates - show 10 dates per page
  const totalDatePages = Math.ceil(availableDates.length / datesPerPage);
  const displayDates = React.useMemo(() => {
    const startIndex = datePage * datesPerPage;
    const endIndex = startIndex + datesPerPage;
    return availableDates.slice(startIndex, endIndex);
  }, [availableDates, datePage, datesPerPage]);

  // Transform delegates data into table rows
  const tableData = React.useMemo(() => {
    return delegates.map((delegate) => ({
      delegateName: delegate.name,
      delegateWcaId: delegate.wcaId,
      regionName: delegate.region?.displayName || "Sin región",
      availabilityDates: new Set(
        delegate.availability.map((avail) => avail.date),
      ),
    }));
  }, [delegates]);

  // Create dynamic columns
  const columns = React.useMemo<ColumnDef<TableRow>[]>(() => {
    const baseColumns: ColumnDef<TableRow>[] = [
      {
        accessorKey: "delegateName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto px-2 py-1"
          >
            Delegado <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="font-medium whitespace-nowrap">
            {row.getValue("delegateName")}
          </div>
        ),
        size: 200,
      },
      {
        accessorKey: "regionName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto px-2 py-1"
          >
            Región <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-sm whitespace-nowrap">
            {row.getValue("regionName")}
          </div>
        ),
        size: 150,
      },
    ];

    // Add date columns
    const dateColumns: ColumnDef<TableRow>[] = displayDates.map((dateStr) => ({
      id: `date-${dateStr}`,
      accessorFn: (row) => row.availabilityDates.has(dateStr),
      header: () => {
        const date = parseLocalDate(dateStr);
        const month = date.toLocaleDateString("es-ES", { month: "short" });
        const day = date.getDate();
        const weekday = date.toLocaleDateString("es-ES", { weekday: "short" });
        return (
          <div className="text-center min-w-15">
            <div className="text-xs font-semibold">{month}</div>
            <div className="text-lg font-bold">{day}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {weekday}
            </div>
          </div>
        );
      },
      cell: ({ getValue }) => {
        const isAvailable = getValue() as boolean;
        return (
          <div className="flex items-center justify-center h-full">
            {isAvailable && (
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600" />
              </div>
            )}
          </div>
        );
      },
      size: 80,
      enableSorting: false,
    }));

    return [...baseColumns, ...dateColumns];
  }, [displayDates]);

  const table = useReactTable({
    data: tableData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Filtrar por delegado..."
          value={
            (table.getColumn("delegateName")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("delegateName")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "bg-muted/50",
                      header.column.id.startsWith("date-") && "text-center",
                    )}
                    style={{ width: header.column.getSize() }}
                  >
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
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.id.startsWith("date-") && "text-center p-2",
                      )}
                    >
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
                  No hay datos de disponibilidad.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Página {datePage + 1} de {totalDatePages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDatePage((p) => Math.max(0, p - 1))}
            disabled={datePage === 0}
          >
            <ChevronLeft />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setDatePage((p) => Math.min(totalDatePages - 1, p + 1))
            }
            disabled={datePage === totalDatePages - 1}
          >
            Siguiente
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
