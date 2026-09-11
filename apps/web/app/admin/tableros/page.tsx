import type { Metadata } from "next";
import { inArray } from "drizzle-orm";

import { db } from "@workspace/db";
import { user } from "@workspace/db/schema";

import {
  AddBoardsOrganizerForm,
  RemoveBoardsOrganizerButton,
} from "@/app/admin/tableros/tableros-forms";

export const metadata: Metadata = {
  title: "Tableros | Admin AMS",
  description: "Allowlist piloto de organizadores con acceso a Tableros AMS.",
};

export default async function AdminTablerosPage() {
  const entries = await db.query.boardsOrganizerAllowlist.findMany({
    orderBy: (t, { asc }) => [asc(t.wcaId)],
    columns: {
      wcaId: true,
      createdAt: true,
    },
  });

  const wcaIds = entries.map((entry) => entry.wcaId);
  const linkedUsers =
    wcaIds.length > 0
      ? await db.query.user.findMany({
          where: inArray(user.wcaId, wcaIds),
          columns: {
            wcaId: true,
            name: true,
            email: true,
            image: true,
          },
        })
      : [];

  const userByWcaId = new Map(linkedUsers.map((u) => [u.wcaId, u]));

  return (
    <div className="space-y-12">
      <header>
        <p className="ams-heading text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
          Piloto
        </p>
        <h2 className="ams-display mt-2 text-[clamp(1.8rem,4vw,2.75rem)] leading-none text-ams-navy">
          Tableros
        </h2>
        <p className="ams-copy mt-3 max-w-2xl text-base leading-7 text-black/65">
          Allowlist de WCA IDs con acceso a Tableros AMS durante el piloto. Los
          delegados siempre entran. Esta sección se podrá eliminar cuando
          Tableros abra a todos los organizadores con sesión.
        </p>
      </header>

      <section className="rounded-5.5 border border-black/10 bg-white p-6 md:p-8">
        <h3 className="ams-display text-2xl leading-none text-ams-navy">
          Agregar organizador
        </h3>
        <p className="ams-copy mt-2 mb-6 text-sm leading-6 text-black/60">
          No hace falta que la persona tenga cuenta AMS todavía. Al iniciar
          sesión con ese WCA ID podrá ver Tableros.
        </p>
        <AddBoardsOrganizerForm />
      </section>

      <section className="space-y-6 rounded-5.5 bg-ams-soft p-6 md:p-8">
        <h3 className="ams-display text-2xl leading-none text-ams-navy">
          Allowlist ({entries.length})
        </h3>
        {entries.length === 0 ? (
          <p className="ams-copy text-sm text-black/60">
            Todavía no hay organizadores en la allowlist.
          </p>
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => {
              const linked = userByWcaId.get(entry.wcaId);
              const label = linked?.name ?? entry.wcaId;
              return (
                <li
                  key={entry.wcaId}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-4.5 bg-white p-5 shadow-[0_10px_24px_rgba(1,11,25,0.06)]"
                >
                  <div className="flex items-center gap-3">
                    {linked?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={linked.image}
                        alt={label}
                        className="size-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="ams-display flex size-12 items-center justify-center rounded-full bg-ams-navy text-sm text-white">
                        {(linked?.name ?? entry.wcaId)
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="ams-heading font-bold text-ams-navy">
                        {label}
                      </p>
                      <p className="ams-copy text-xs text-black/50">
                        {entry.wcaId}
                        {linked?.email
                          ? ` · ${linked.email}`
                          : " · sin cuenta AMS"}
                      </p>
                    </div>
                  </div>
                  <RemoveBoardsOrganizerButton
                    wcaId={entry.wcaId}
                    label={label}
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
