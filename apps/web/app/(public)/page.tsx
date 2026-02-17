import { db } from "@/db";
import { eq, asc } from "drizzle-orm";
import { CalendarView } from "./_components/calendar-view";
import { RegionFilter } from "./_components/region-filter";
import { availability, competitions, regions, states, user } from "@/db/schema";
import { SemaphoreLegend } from "./_components/semaphore-legend";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface PageProps {
  searchParams?: Promise<{
    region?: string;
  }>;
}

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;

  const regionFilter = searchParams?.region;

  const compsRaw = await db
    .select()
    .from(competitions)
    .innerJoin(states, eq(competitions.stateId, states.id))
    .innerJoin(regions, eq(states.regionId, regions.id))
    .where(regionFilter ? eq(regions.id, regionFilter) : undefined)
    .orderBy(asc(competitions.startDate));

  const comps = compsRaw.map((row) => {
    const c = row.competition;
    const s = row.state;
    const r = row.region;

    return {
      ...c,
      state: {
        ...s,
        region: {
          ...r,
        },
      },
    };
  });

  const avail = await db
    .selectDistinct({
      date: availability.date,
    })
    .from(availability)
    .innerJoin(user, eq(availability.userWcaId, user.wcaId))
    .innerJoin(regions, eq(user.regionId, regions.id))
    .innerJoin(states, eq(regions.id, states.regionId))
    .where(regionFilter ? eq(regions.id, regionFilter) : undefined)
    .orderBy(asc(availability.date));

  const holidays = await db.query.holidays.findMany();

  const reg = await db.query.regions.findMany({
    orderBy: (t, { asc }) => [asc(t.displayName)],
  });

  const headersList = await headers();

  const session = await auth.api.getSession({
    headers: headersList,
  });

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
