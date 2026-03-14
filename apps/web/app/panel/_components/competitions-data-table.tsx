"use client";

import * as React from "react";
import { DataTable } from "@workspace/ui/components/data-table/data-table";
// import { DataTableAdvancedToolbar } from "@workspace/ui/components/data-table/data-table-advanced-toolbar";
// import { DataTableFilterList } from "@workspace/ui/components/data-table/data-table-filter-list";
// import { DataTableFilterMenu } from "@workspace/ui/components/data-table/data-table-filter-menu";
// import { DataTableSortList } from "@workspace/ui/components/data-table/data-table-sort-list";
import { DataTableToolbar } from "@workspace/ui/components/data-table/data-table-toolbar";
import { useDataTable } from "@workspace/ui/hooks/use-data-table";
import type { QueryKeys } from "@workspace/ui/types/data-table";
import type {
  getCompetitions,
  getCompetitionDelegatesCounts,
  getCompetitionStateCounts,
  getCompetitionStatusPublicCounts,
  getCompetitionStatusInternalCounts,
} from "../_lib/queries";
// import { useFeatureFlags } from "./feature-flags-provider";
// import { TasksTableActionBar } from "./tasks-table-action-bar";
import { getCompetitionsTableColumns } from "./competitions-table-columns";
import Link from "next/link";
import { buttonVariants } from "@workspace/ui/components/button";
import { PlusCircle } from "lucide-react";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";

interface CompetitionsTableProps {
  promises: Promise<
    [
      Awaited<ReturnType<typeof getCompetitions>>,
      Awaited<ReturnType<typeof getCompetitionDelegatesCounts>>,
      Awaited<ReturnType<typeof getCompetitionStateCounts>>,
      Awaited<ReturnType<typeof getCompetitionStatusPublicCounts>>,
      Awaited<ReturnType<typeof getCompetitionStatusInternalCounts>>,
    ]
  >;
  queryKeys?: Partial<QueryKeys>;
}

export function CompetitionsTable({
  promises,
  queryKeys,
}: CompetitionsTableProps) {
  // const { enableAdvancedFilter, filterFlag } = useFeatureFlags();

  const [
    { data, pageCount },
    delegatesCounts,
    stateCounts,
    statusPublicCounts,
    statusInternalCounts,
  ] =
    React.use(promises);

  const columns = React.useMemo(
    () =>
      getCompetitionsTableColumns({
        delegatesCounts,
        stateCounts,
        statusPublicCounts,
        statusInternalCounts,
      }),
    [delegatesCounts, stateCounts, statusPublicCounts, statusInternalCounts],
  );

  const isMobile = useIsMobile();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns,
    pageCount,
    // enableAdvancedFilter,
    initialState: {
      sorting: [{ id: "startDate", desc: true }],
      columnPinning: { right: ["actions"] },
    },
    queryKeys,
    getRowId: (originalRow) => String(originalRow.id),
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <DataTable
      table={table}
    // actionBar={<TasksTableActionBar table={table} />}
    >
      {/* {enableAdvancedFilter ? (
        <DataTableAdvancedToolbar table={table}>
          <DataTableSortList table={table} align="start" />
          {filterFlag === "advancedFilters" ? (
            <DataTableFilterList
              table={table}
              shallow={shallow}
              debounceMs={debounceMs}
              throttleMs={throttleMs}
              align="start"
            />
          ) : (
            <DataTableFilterMenu
              table={table}
              shallow={shallow}
              debounceMs={debounceMs}
              throttleMs={throttleMs}
            />
          )}
        </DataTableAdvancedToolbar>
      ) : ( */}
      <DataTableToolbar table={table}>
        {/* <DataTableSortList table={table} align="end" /> */}
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
      </DataTableToolbar>
      {/* )} */}
    </DataTable>
  );
}
