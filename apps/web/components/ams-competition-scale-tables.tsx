import {
  formatCompetitorsBand,
  formatDelegatesLabel,
  formatStationsBand,
  type AmsCompetitionTier,
} from "@workspace/db/ams-competition-scale";

export function AmsCompetitionScaleTables({
  tiers,
  highlightIndex = null,
  className,
}: {
  tiers: readonly AmsCompetitionTier[];
  highlightIndex?: number | null;
  className?: string;
}) {
  return (
    <div className={className ?? "space-y-10"}>
      <div className="space-y-3 overflow-x-auto">
        <h3 className="ams-heading text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
          Experiencia del organizador
        </h3>
        <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-ams-soft">
              <th className="border border-black/10 px-3 py-2 font-semibold text-ams-navy">
                Núm. competencias
              </th>
              <th className="border border-black/10 px-3 py-2 font-semibold text-ams-navy">
                Competidores
              </th>
              <th className="border border-black/10 px-3 py-2 font-semibold text-ams-navy">
                Estaciones
              </th>
              <th className="border border-black/10 px-3 py-2 font-semibold text-ams-navy">
                Categorías máx.
              </th>
              <th className="border border-black/10 px-3 py-2 font-semibold text-ams-navy">
                Nivel
              </th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier, index) => {
              const active = highlightIndex === index;
              return (
                <tr
                  key={tier.level}
                  className={active ? "bg-ams-orange/15 font-medium" : undefined}
                >
                  <td className="border border-black/10 px-3 py-2">
                    {tier.minOrganizerCompetitions}
                  </td>
                  <td className="border border-black/10 px-3 py-2">
                    {formatCompetitorsBand(tier, index, tiers)}
                  </td>
                  <td className="border border-black/10 px-3 py-2">
                    {formatStationsBand(
                      tier,
                      index > 0 ? tiers[index - 1]!.maxStations : undefined,
                    )}
                  </td>
                  <td className="border border-black/10 px-3 py-2">
                    {tier.maxEvents}
                  </td>
                  <td className="border border-black/10 px-3 py-2">
                    {tier.labelEs}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 overflow-x-auto">
        <h3 className="ams-heading text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
          Delegados por competidores y estaciones
        </h3>
        <table className="w-full min-w-[24rem] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-ams-soft">
              <th className="border border-black/10 px-3 py-2 font-semibold text-ams-navy">
                Competidores
              </th>
              <th className="border border-black/10 px-3 py-2 font-semibold text-ams-navy">
                Estaciones
              </th>
              <th className="border border-black/10 px-3 py-2 font-semibold text-ams-navy">
                Núm. de delegados
              </th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier, index) => {
              const active = highlightIndex === index;
              return (
                <tr
                  key={`delegates-${tier.level}`}
                  className={active ? "bg-ams-orange/15 font-medium" : undefined}
                >
                  <td className="border border-black/10 px-3 py-2">
                    {formatCompetitorsBand(tier, index, tiers)}
                  </td>
                  <td className="border border-black/10 px-3 py-2">
                    {formatStationsBand(
                      tier,
                      index > 0 ? tiers[index - 1]!.maxStations : undefined,
                    )}
                  </td>
                  <td className="border border-black/10 px-3 py-2">
                    {formatDelegatesLabel(tier)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
