import { Suspense } from "react";

import { HolidaysManager } from "./_components/holidays-manager";
import { getHolidaysForYear } from "./_lib/queries";
import Loading from "./loading";

interface PageProps {
  searchParams?: Promise<{
    year?: string;
  }>;
}

function buildYearOptions(currentYear: number) {
  const years: number[] = [];
  for (let y = currentYear - 1; y <= currentYear + 2; y++) {
    years.push(y);
  }
  return years;
}

async function PageContent({
  searchParams,
}: {
  searchParams: PageProps["searchParams"];
}) {
  const resolved = await searchParams;
  const currentYear = new Date().getFullYear();
  const parsed = Number.parseInt(resolved?.year ?? "", 10);
  const year =
    Number.isFinite(parsed) && parsed >= 2000 && parsed <= 2100
      ? parsed
      : currentYear;

  const holidays = await getHolidaysForYear(year);
  const years = buildYearOptions(currentYear);

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Feriados</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Administra los feriados que se muestran en el calendario público.
          </p>
        </div>
        <HolidaysManager year={year} years={years} holidays={holidays} />
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
