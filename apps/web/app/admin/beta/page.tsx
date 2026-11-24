import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { Suspense } from "react";

import { betaFeatureLabel } from "@workspace/db/beta-feature-labels";
import { formatEquipmentDate } from "@workspace/db/equipment-labels";

import { requireDelegateAdminPage } from "@/app/admin/_lib/admin-access";

import { GrantBetaFeatureForm } from "./grant-form";
import { listAdminBetaGrants } from "./queries";
import { RevokeBetaFeatureForm } from "./revoke-form";

export const metadata: Metadata = {
  title: "Beta | Admin AMS",
  description:
    "Concede funciones experimentales a usuarios concretos cuando existan betas por cuenta.",
};

async function PageContent() {
  await connection();
  await requireDelegateAdminPage();
  const rows = await listAdminBetaGrants();

  return (
    <div className="space-y-12">
      <section className="rounded-5.5 border border-black/10 bg-white p-6 md:p-8">
        <h3 className="ams-display mb-2 text-2xl leading-none text-ams-navy">
          Conceder acceso beta
        </h3>
        <p className="ams-copy mb-6 max-w-2xl text-sm leading-6 text-black/65">
          Las funciones beta por usuario quedan apagadas hasta que un delegado
          las active aquí. Las herramientas nuevas del tablero se activan por
          tablero en el panel del calendario.
        </p>
        <GrantBetaFeatureForm />
      </section>

      <section className="rounded-5.5 bg-ams-soft p-6 md:p-8">
        <h3 className="ams-display mb-6 text-2xl leading-none text-ams-navy">
          Accesos activos
        </h3>
        {rows.length === 0 ? (
          <p className="ams-copy text-sm text-black/55">
            Nadie tiene funciones beta por usuario todavía.
          </p>
        ) : (
          <ul className="ams-copy divide-y divide-black/10 text-sm">
            {rows.map((row) => {
              const label = betaFeatureLabel(row.featureKey);
              return (
                <li
                  key={`${row.userId}:${row.featureKey}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {row.image ? (
                      <Image
                        src={row.image}
                        alt=""
                        width={36}
                        height={36}
                        className="size-9 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-full bg-white text-xs font-bold text-ams-navy">
                        {row.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold">{row.name}</p>
                      <p className="break-all text-xs text-black/55">
                        {label}
                        {" · "}
                        {row.wcaId ?? row.email}
                        {row.grantedByName
                          ? ` · concedido por ${row.grantedByName}`
                          : null}
                        {` · ${formatEquipmentDate(row.createdAt)}`}
                      </p>
                    </div>
                  </div>
                  <RevokeBetaFeatureForm
                    userId={row.userId}
                    featureKey={row.featureKey}
                    featureLabel={label}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AdminBetaPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="ams-heading text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
          Experimentos
        </p>
        <h2 className="ams-display mt-2 text-[clamp(1.8rem,4vw,2.75rem)] leading-none text-ams-navy">
          Funciones beta
        </h2>
        <p className="ams-copy mt-3 max-w-2xl text-base leading-7 text-black/65">
          Activa herramientas nuevas para personas concretas mientras se
          validan. Hoy no hay betas por usuario; las herramientas del tablero se
          activan al crear o asignar el tablero en el calendario.
        </p>
      </header>
      <Suspense
        fallback={
          <p className="ams-copy text-sm text-black/55">Cargando accesos…</p>
        }
      >
        <PageContent />
      </Suspense>
    </div>
  );
}
