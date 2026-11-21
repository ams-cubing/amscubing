import type { Metadata } from "next";

import { requireDelegateAdminPage } from "@/app/admin/_lib/admin-access";

import { loadCompetitionScaleConfig } from "./actions";
import { ScaleEditor } from "./scale-editor";

export const metadata: Metadata = {
  title: "Tabuladores | Admin AMS",
  description:
    "Edita los tabuladores AMS de experiencia del organizador y delegados.",
};

export default async function AdminTabuladoresPage() {
  await requireDelegateAdminPage();
  const config = await loadCompetitionScaleConfig();

  return (
    <div className="space-y-8">
      <header>
        <p className="ams-heading text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
          Escala AMS
        </p>
        <h2 className="ams-display mt-2 text-[clamp(1.8rem,4vw,2.75rem)] leading-none text-ams-navy">
          Tabuladores
        </h2>
        <p className="ams-copy mt-3 max-w-2xl text-base leading-7 text-black/65">
          Estos valores alimentan la página pública{" "}
          <a href="/tabuladores" className="text-ams-red underline-offset-2 hover:underline">
            /tabuladores
          </a>{" "}
          y el cálculo de nivel en los tableros de competencia.
        </p>
      </header>

      <ScaleEditor initial={config} />
    </div>
  );
}
