import type { Metadata } from "next";
import { eq } from "drizzle-orm";

import { db } from "@workspace/db";
import { user } from "@workspace/db/schema";

import {
  GrantEditorForm,
  RevokeEditorButton,
} from "@/app/admin/editores/editor-forms";

export const metadata: Metadata = {
  title: "Editores | Admin AMS",
  description: "Otorga o revoca el rol editorial para el blog de AMS.",
};

export default async function AdminEditoresPage() {
  const editors = await db.query.user.findMany({
    where: eq(user.role, "editor"),
    orderBy: (t, { asc }) => [asc(t.name)],
    columns: {
      wcaId: true,
      name: true,
      email: true,
      image: true,
    },
  });

  return (
    <div className="space-y-12">
      <header>
        <p className="ams-heading text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
          Blog (próximamente)
        </p>
        <h2 className="ams-display mt-2 text-[clamp(1.8rem,4vw,2.75rem)] leading-none text-ams-navy">
          Editores
        </h2>
        <p className="ams-copy mt-3 max-w-2xl text-base leading-7 text-black/65">
          El rol editor permitirá publicar en el blog cuando el CMS esté listo.
          Los delegados también tendrán acceso editorial. Quien aún no tenga
          cuenta AMS debe iniciar sesión una vez antes de recibir el rol.
        </p>
      </header>

      <section className="rounded-5.5 border border-black/10 bg-white p-6 md:p-8">
        <h3 className="ams-display text-2xl leading-none text-ams-navy">
          Otorgar rol editor
        </h3>
        <p className="ams-copy mt-2 mb-6 text-sm leading-6 text-black/60">
          Solo aplica a cuentas con rol usuario. No se puede asignar a
          delegados.
        </p>
        <GrantEditorForm />
      </section>

      <section className="space-y-6 rounded-5.5 bg-ams-soft p-6 md:p-8">
        <h3 className="ams-display text-2xl leading-none text-ams-navy">
          Actuales ({editors.length})
        </h3>
        {editors.length === 0 ? (
          <p className="ams-copy text-sm text-black/60">
            Todavía no hay editores asignados.
          </p>
        ) : (
          <ul className="space-y-4">
            {editors.map((editor) => (
              <li
                key={editor.wcaId}
                className="flex flex-wrap items-center justify-between gap-4 rounded-4.5 bg-white p-5 shadow-[0_10px_24px_rgba(1,11,25,0.06)]"
              >
                <div className="flex items-center gap-3">
                  {editor.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={editor.image}
                      alt=""
                      className="size-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="ams-display flex size-12 items-center justify-center rounded-full bg-ams-navy text-sm text-white">
                      {editor.name
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
                      {editor.name}
                    </p>
                    <p className="ams-copy text-xs text-black/50">
                      {editor.wcaId} · {editor.email}
                    </p>
                  </div>
                </div>
                <RevokeEditorButton wcaId={editor.wcaId} name={editor.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
