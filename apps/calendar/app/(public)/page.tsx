import { Suspense } from "react";
import { CalendarView } from "./_components/calendar-view";
import { RegionFilter } from "./_components/region-filter";
import { SemaphoreLegend } from "./_components/semaphore-legend";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getCompetitionsForRegion,
  getAvailabilityDates,
  getHolidays,
  getRegions,
} from "./_lib/queries";
import Loading from "./loading";

interface PageProps {
  searchParams?: Promise<{
    region?: string;
  }>;
}

async function PageContent({
  searchParams,
}: {
  searchParams: PageProps["searchParams"];
}) {
  const resolvedSearchParams = await searchParams;
  const regionFilter = resolvedSearchParams?.region;

  const [comps, avail, holidays, reg] = await Promise.all([
    getCompetitionsForRegion(regionFilter),
    getAvailabilityDates(regionFilter),
    getHolidays(),
    getRegions(),
  ]);

  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <RegionFilter regions={reg} selected={regionFilter ?? ""} />
        <CalendarView
          competitions={comps}
          holidays={holidays}
          availability={avail}
          role={session?.user.role}
        />
        <SemaphoreLegend />
      </div>
    </main>
  );
}

export default function Page(props: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent searchParams={props.searchParams} />
    </Suspense>
  );
}
