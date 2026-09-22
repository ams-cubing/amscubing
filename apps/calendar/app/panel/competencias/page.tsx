import { searchParamsCache } from "../_lib/validations";
import type { SearchParams } from "@/types";
import {
  getCompetitions,
  getCompetitionDelegatesCounts,
  getCompetitionStateCounts,
  getCompetitionStatusInternalCounts,
  getCompetitionStatusPublicCounts,
} from "../_lib/queries";
import { getValidFilters } from "@workspace/ui/lib/data-table";
import { CompetitionsTable } from "../_components/competitions-data-table";
import { Suspense } from "react";
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton";

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default function Page(props: PageProps) {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Competencias</h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Gestiona todas las competencias del calendario.
        </p>
      </div>

      <Suspense
        fallback={
          <DataTableSkeleton
            columnCount={7}
            filterCount={2}
            cellWidths={[
              "10rem",
              "30rem",
              "10rem",
              "10rem",
              "6rem",
              "6rem",
              "6rem",
            ]}
            shrinkZero
          />
        }
      >
        <CompetitionsTableWrapper {...props} />
      </Suspense>
    </div>
  );
}

async function CompetitionsTableWrapper(props: PageProps) {
  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse(searchParams);

  const delegates = search.delegates.length > 0 ? search.delegates : [];

  const validFilters = getValidFilters(search.filters);

  const promises = Promise.all([
    getCompetitions({
      ...search,
      delegates,
      filters: validFilters,
    }),
    getCompetitionDelegatesCounts(),
    getCompetitionStateCounts(),
    getCompetitionStatusPublicCounts(),
    getCompetitionStatusInternalCounts(),
  ]);

  return <CompetitionsTable promises={promises} />;
}
