import { Suspense } from "react";
import { Button } from "@workspace/ui/components/button";
import { NativeSelect } from "@workspace/ui/components/native-select";
import {
  EQUIPMENT_EVENT_LABELS,
  type EquipmentEventAction,
} from "@workspace/db/equipment-labels";

import { EventTimeline } from "../_components/event-timeline";
import { getActivity, getGuardians } from "../_lib/queries";
import Loading from "../loading";

type SearchParams = Promise<{
  actor?: string;
  guardian?: string;
  accion?: string;
}>;

const ACTIONS = Object.keys(EQUIPMENT_EVENT_LABELS) as EquipmentEventAction[];

async function PageContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const action = ACTIONS.includes(params.accion as EquipmentEventAction)
    ? (params.accion as EquipmentEventAction)
    : undefined;
  const [events, people] = await Promise.all([
    getActivity({
      actorId: params.actor || undefined,
      guardianUserId: params.guardian || undefined,
      action,
    }),
    getGuardians(),
  ]);

  return (
    <div className="space-y-6">
      <form
        action="/panel/equipo/actividad"
        className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <NativeSelect name="actor" defaultValue={params.actor ?? ""}>
          <option value="">Cualquier persona que registró</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="guardian" defaultValue={params.guardian ?? ""}>
          <option value="">Cualquier guardián</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="accion" defaultValue={action ?? ""}>
          <option value="">Cualquier acción</option>
          {ACTIONS.map((value) => (
            <option key={value} value={value}>
              {EQUIPMENT_EVENT_LABELS[value]}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>
      <div className="bg-card rounded-lg border p-4">
        <EventTimeline events={events} showSku />
      </div>
    </div>
  );
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Actividad del equipo</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Quién cambió qué y cuándo: altas, estados, transferencias, préstamos y
          devoluciones.
        </p>
      </div>
      <Suspense fallback={<Loading />}>
        <PageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
