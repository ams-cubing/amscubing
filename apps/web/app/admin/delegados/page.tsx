import type { Metadata } from "next";
import { eq } from "drizzle-orm";

import { db } from "@workspace/db";
import { MEXICO_REGIONS } from "@workspace/db/data/mexico";
import { user } from "@workspace/db/schema";

import {
  AddDelegateForm,
  DelegateEditForm,
} from "@/app/admin/delegados/delegate-forms";

export const metadata: Metadata = {
  title: "Delegados | Admin AMS",
  description: "Edita ubicaciones y perfiles públicos de delegados WCA.",
};

export default async function AdminDelegadosPage() {
  const delegates = await db.query.user.findMany({
    where: eq(user.role, "delegate"),
    orderBy: (t, { asc }) => [asc(t.name)],
    columns: {
      wcaId: true,
      name: true,
      email: true,
      delegateTitle: true,
      delegateLocation: true,
      regionId: true,
    },
  });

  const regions = MEXICO_REGIONS.map((region) => ({
    id: region.id,
    displayName: region.displayName,
  }));

  return (
    <div className="space-y-12">
      <header>
        <p className="ams-heading text-sm font-bold uppercase tracking-[0.12em] text-[var(--ams-red)]">
          Listado público
        </p>
        <h2 className="ams-display mt-2 text-[clamp(1.8rem,4vw,2.75rem)] leading-none text-[var(--ams-navy)]">
          Delegados
        </h2>
        <p className="ams-copy mt-3 max-w-2xl text-base leading-7 text-black/65">
          Estos perfiles aparecen en Nosotros. Edita título, ubicación y región,
          o agrega un delegado nuevo por WCA ID.
        </p>
      </header>

      <section className="space-y-6 rounded-[22px] bg-[var(--ams-soft)] p-6 md:p-8">
        <h3 className="ams-display text-2xl leading-none text-[var(--ams-navy)]">
          Actuales ({delegates.length})
        </h3>
        {delegates.length === 0 ? (
          <p className="ams-copy text-sm text-black/60">
            No hay delegados en la base de datos.
          </p>
        ) : (
          <ul className="space-y-8">
            {delegates.map((delegate) => (
              <li
                key={delegate.wcaId}
                className="rounded-[18px] bg-white p-5 shadow-[0_10px_24px_rgba(1,11,25,0.06)]"
              >
                <DelegateEditForm
                  delegate={{
                    wcaId: delegate.wcaId,
                    name: delegate.name,
                    email: delegate.email,
                    title: delegate.delegateTitle ?? "Delegado",
                    location: delegate.delegateLocation ?? "",
                    regionId: delegate.regionId ?? regions[0]?.id ?? "centro",
                  }}
                  regions={regions}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[22px] border border-black/10 bg-white p-6 md:p-8">
        <h3 className="ams-display text-2xl leading-none text-[var(--ams-navy)]">
          Agregar delegado
        </h3>
        <p className="ams-copy mt-2 mb-6 text-sm leading-6 text-black/60">
          Si la persona ya tiene cuenta AMS, se promueve a delegado. Si no, se
          crea un registro listo para cuando inicie sesión.
        </p>
        <AddDelegateForm regions={regions} />
      </section>
    </div>
  );
}
