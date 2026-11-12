import { Trophy } from "lucide-react";

export function ChampionshipRibbon() {
  return (
    <span className="ams-heading absolute right-0 top-0 inline-flex items-center gap-1.5 bg-ams-orange py-2 pl-5 pr-3 text-[11px] font-bold uppercase tracking-[0.04em] text-white [clip-path:polygon(12%_0,100%_0,100%_100%,0_100%)]">
      <Trophy className="size-3.5" />
      Campeonato
    </span>
  );
}
