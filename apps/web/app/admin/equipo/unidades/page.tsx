import { Suspense } from "react";

import { requireDelegate } from "@/lib/session";

import { ItemsTable } from "../_components/items-table";
import { getGuardians, getInventoryOverview } from "../_lib/queries";
import Loading from "./loading";

type SearchParams = Promise<{ guardian?: string }>;

async function PageContent({ searchParams }: { searchParams: SearchParams }) {
  const [params, session, { items }, guardians] = await Promise.all([
    searchParams,
    requireDelegate(),
    getInventoryOverview(),
    getGuardians(),
  ]);
  const initialGuardianId = params.guardian || null;

  return (
    <ItemsTable
      key={initialGuardianId ?? ""}
      items={items}
      guardians={guardians}
      initialGuardianId={initialGuardianId}
      currentUserId={session.ok ? session.session.user.id : null}
    />
  );
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Unidades</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Cada timer, display y accesorio con SKU, su estado y quién lo
          resguarda.
        </p>
      </div>
      <Suspense fallback={<Loading />}>
        <PageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
