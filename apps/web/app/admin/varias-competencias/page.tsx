import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { Suspense } from "react";

import { formatEquipmentDate } from "@workspace/db/equipment-labels";

import { requireDelegateAdminPage } from "@/app/admin/_lib/admin-access";

import { GrantMultiCompetitionForm } from "./grant-form";
import { listMultiCompetitionOrganizers } from "./queries";
import { RevokeMultiCompetitionForm } from "./revoke-form";

export const metadata: Metadata = {
  title: "Varias competencias | Admin AMS",
  description:
    "Permite a organizadores solicitar fechas aunque ya tengan otra competencia sin anunciar.",
};

async function PageContent() {
  await connection();
  await requireDelegateAdminPage();
  const rows = await listMultiCompetitionOrganizers();

  return (
    <div className="space-y-12">
      <section className="rounded-5.5 border border-black/10 bg-white p-6 md:p-8">
        <h3 className="ams-display mb-2 text-2xl leading-none text-ams-navy">
          Conceder permiso
        </h3>
        <p className="ams-copy mb-6 max-w-2xl text-sm leading-6 text-black/65">
          Por defecto un organizador solo puede tener una competencia futura
          sin anunciar. Este permiso le deja solicitar más fechas a la vez.
        </p>
        <GrantMultiCompetitionForm
          excludedUserIds={rows.map((row) => row.userId)}
        />
      </section>

      <section className="rounded-5.5 bg-ams-soft p-6 md:p-8">
        <h3 className="ams-display mb-6 text-2xl leading-none text-ams-navy">
          Organizadores con permiso
        </h3>
        {rows.length === 0 ? (
          <p className="ams-copy text-sm text-black/55">
            Nadie tiene el permiso todavía.
          </p>
        ) : (
          <ul className="ams-copy divide-y divide-black/10 text-sm">
            {rows.map((row) => (
              <li
                key={row.userId}
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
                      {row.wcaId ?? row.email}
                      {row.grantedByName
                        ? ` · concedido por ${row.grantedByName}`
                        : null}
                      {` · ${formatEquipmentDate(row.createdAt)}`}
                    </p>
                  </div>
                </div>
                <RevokeMultiCompetitionForm userId={row.userId} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AdminMultiCompetitionsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="ams-heading text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
          Organizadores
        </p>
        <h2 className="ams-display mt-2 text-[clamp(1.8rem,4vw,2.75rem)] leading-none text-ams-navy">
          Varias competencias
        </h2>
        <p className="ams-copy mt-3 max-w-2xl text-base leading-7 text-black/65">
          Lista quién puede organizar más de una competencia sin anunciar al
          mismo tiempo. También se puede activar desde el detalle de una
          competencia en el calendario.
        </p>
      </header>
      <Suspense
        fallback={
          <div className="h-64 animate-pulse rounded-5.5 bg-ams-soft" />
        }
      >
        <PageContent />
      </Suspense>
    </div>
  );
}
