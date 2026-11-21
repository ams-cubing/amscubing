import "./env";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { eq, ilike, or, sql } from "drizzle-orm";

import {
  regionIdForState,
  resolveMexicoStateFromWcaCity,
} from "./data/mexico";
import { db } from "./index";
import { saveCompetitionFormat } from "./competition-format";
import { boards, competitions } from "./schema";
import type { HorarioEstimatesData } from "./horario-estimates";
import {
  aggregateHorarioEstimates,
  eventsPlanFromWcifMetrics,
  flattenWcifRounds,
  formatRoundTable,
  inferStationCount,
  type HorarioEventEstimate,
} from "./wcif/flatten-rounds";
import type { FlatRoundMetric } from "./wcif/types";
import type { Wcif } from "./wcif/types";

const WCA_WCIF_PUBLIC =
  "https://www.worldcubeassociation.org/api/v0/competitions";
const WCA_COMPETITIONS_API =
  "https://www.worldcubeassociation.org/api/v0/competitions";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(HERE, "../.cache/wcif");

type Args = {
  comps: string[];
  seedBoard: boolean;
  mxYears: number | null;
  writeEstimates: boolean;
  fromCache: boolean;
};

function parseArgs(argv: string[]): Args {
  const comps: string[] = [];
  let seedBoard = false;
  let mxYears: number | null = null;
  let writeEstimates = false;
  let fromCache = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--") continue;
    if (arg === "--comp" || arg === "-c") {
      const value = argv[++i];
      if (!value) throw new Error("--comp requires a competition id");
      comps.push(value);
    } else if (arg === "--seed-board") {
      seedBoard = true;
    } else if (arg === "--mx-years") {
      const value = Number(argv[++i]);
      if (!Number.isFinite(value) || value < 1) {
        throw new Error("--mx-years requires a positive number");
      }
      mxYears = value;
    } else if (arg === "--write-estimates") {
      writeEstimates = true;
    } else if (arg === "--from-cache") {
      fromCache = true;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (comps.length === 0 && mxYears == null && !fromCache) {
    comps.push("Chiconcuac2026");
  }

  return { comps, seedBoard, mxYears, writeEstimates, fromCache };
}

function printUsage() {
  console.log(`Usage: analyze:horario [options]

Options:
  --comp <id>          WCA competition id (repeatable). Default: Chiconcuac2026
  --seed-board         Write eventsPlan + stations into the linked local competition
  --mx-years <n>       Also fetch ended MX comps from the last n years
  --from-cache         Analyze every WCIF already in packages/db/.cache/wcif
  --write-estimates    Write packages/db/src/horario-estimates-data.ts from aggregates
  --help               Show this help
`);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureCacheDir() {
  await mkdir(CACHE_DIR, { recursive: true });
}

async function loadCachedWcif(competitionId: string): Promise<Wcif | null> {
  try {
    const raw = await readFile(
      path.join(CACHE_DIR, `${competitionId}.json`),
      "utf8",
    );
    return JSON.parse(raw) as Wcif;
  } catch {
    return null;
  }
}

async function fetchWithRetry(
  url: string,
  options?: { tries?: number },
): Promise<Response> {
  const tries = options?.tries ?? 3;
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (response.ok) return response;
    if (response.status === 429 && attempt < tries) {
      const waitMs = 1000 * 2 ** attempt;
      console.warn(`⏳ 429 for ${url}; retry in ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }
    lastError = new Error(`HTTP ${response.status} for ${url}`);
    if (response.status !== 429) break;
  }
  throw lastError ?? new Error(`Fetch failed for ${url}`);
}

async function fetchWcif(competitionId: string): Promise<Wcif> {
  const cached = await loadCachedWcif(competitionId);
  if (cached) {
    console.log(`📦 Cache hit ${competitionId}`);
    return cached;
  }

  const url = `${WCA_WCIF_PUBLIC}/${encodeURIComponent(competitionId)}/wcif/public`;
  console.log(`⬇️  Fetching ${url}`);
  const response = await fetchWithRetry(url);
  const wcif = (await response.json()) as Wcif;
  await ensureCacheDir();
  await writeFile(
    path.join(CACHE_DIR, `${competitionId}.json`),
    JSON.stringify(wcif),
    "utf8",
  );
  return wcif;
}

/** WCA competition id → city string from the list API / cities sidecar. */
const competitionCityById = new Map<string, string>();
const CITIES_CACHE_PATH = path.join(CACHE_DIR, "cities.json");

async function loadCitiesCache(): Promise<void> {
  try {
    const raw = await readFile(CITIES_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Record<string, string>;
    for (const [id, city] of Object.entries(parsed)) {
      if (typeof city === "string" && city.length > 0) {
        competitionCityById.set(id, city);
      }
    }
  } catch {
    // no sidecar yet
  }
}

async function saveCitiesCache(): Promise<void> {
  await ensureCacheDir();
  const payload = Object.fromEntries(competitionCityById.entries());
  await writeFile(CITIES_CACHE_PATH, JSON.stringify(payload, null, 2), "utf8");
}

async function listMexicoCompetitions(
  years: number,
): Promise<Array<{ id: string; city: string | null }>> {
  const end = new Date();
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - years);
  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);
  const comps: Array<{ id: string; city: string | null }> = [];

  for (let page = 1; page <= 12; page += 1) {
    const url = new URL(WCA_COMPETITIONS_API);
    url.searchParams.set("country_iso2", "MX");
    url.searchParams.set("start", startIso);
    url.searchParams.set("end", endIso);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const response = await fetchWithRetry(url.toString());
    const rows = (await response.json()) as Array<{
      id: string;
      city?: string | null;
      end_date: string;
      cancelled_at?: string | null;
    }>;
    if (rows.length === 0) break;

    for (const row of rows) {
      if (row.cancelled_at) continue;
      if (row.end_date > endIso) continue;
      comps.push({ id: row.id, city: row.city ?? null });
      if (row.city) competitionCityById.set(row.id, row.city);
    }
    if (rows.length < 100) break;
    await sleep(350);
  }

  await saveCitiesCache();
  return comps;
}

async function resolveLocationForCompetition(competitionId: string): Promise<{
  stateId: string | null;
  regionId: string | null;
}> {
  const city = competitionCityById.get(competitionId) ?? null;
  let stateId = resolveMexicoStateFromWcaCity(city);

  if (!stateId) {
    try {
      const local = await db.query.competitions.findFirst({
        where: ilike(
          competitions.wcaCompetitionUrl,
          `%/competitions/${competitionId}%`,
        ),
        columns: { stateId: true },
      });
      stateId = local?.stateId ?? null;
    } catch {
      // DB optional for offline analyze runs
    }
  }

  return {
    stateId,
    regionId: stateId ? regionIdForState(stateId) : null,
  };
}

function wcaIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/competitions\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

async function resolveCompetitionForWcif(wcif: Wcif): Promise<{
  id: number;
  name: string | null;
  capacity: number;
  zoneCount: number;
  wcaCompetitionUrl: string | null;
}> {
  const wcaId = wcif.id;
  const byUrl = await db.query.competitions.findFirst({
    where: ilike(competitions.wcaCompetitionUrl, `%/competitions/${wcaId}%`),
    columns: {
      id: true,
      name: true,
      capacity: true,
      zoneCount: true,
      wcaCompetitionUrl: true,
    },
  });
  if (byUrl) return byUrl;

  const board = await db.query.boards.findFirst({
    where: or(
      ilike(boards.name, `%${wcif.name ?? wcaId}%`),
      ilike(boards.name, "%Chiconcuac%"),
    ),
    columns: { id: true, competitionId: true, name: true },
  });
  if (board?.competitionId) {
    const row = await db.query.competitions.findFirst({
      where: eq(competitions.id, board.competitionId),
      columns: {
        id: true,
        name: true,
        capacity: true,
        zoneCount: true,
        wcaCompetitionUrl: true,
      },
    });
    if (row) {
      console.log(`→ Matched board «${board.name}» → competition ${row.id}`);
      return row;
    }
  }

  const byName = await db.query.competitions.findFirst({
    where: or(
      ilike(competitions.name, `%${wcif.name ?? wcaId}%`),
      sql`${competitions.name} ILIKE '%Chiconcuac%'`,
    ),
    columns: {
      id: true,
      name: true,
      capacity: true,
      zoneCount: true,
      wcaCompetitionUrl: true,
    },
  });
  if (byName) return byName;

  throw new Error(
    `No local competition/board found for ${wcaId}. Link a board first.`,
  );
}

async function seedBoardFromWcif(wcif: Wcif) {
  const rows = flattenWcifRounds(wcif);
  const eventsPlan = eventsPlanFromWcifMetrics(rows);
  const stationCount = inferStationCount(rows);
  const wcaId = wcif.id;
  const competition = await resolveCompetitionForWcif(wcif);

  console.log(
    `→ Seeding competition id=${competition.id} «${competition.name}» (cupo ${competition.capacity})`,
  );

  const cappedPlan = eventsPlan.map((item) => ({
    ...item,
    expectedCompetitors: Math.min(
      item.expectedCompetitors,
      competition.capacity,
    ),
  }));

  const clipped = cappedPlan.filter(
    (item, index) =>
      item.expectedCompetitors !== eventsPlan[index]?.expectedCompetitors,
  );
  if (clipped.length > 0) {
    console.warn(
      `⚠️  Clipped ${clipped.length} event(s) expectedCompetitors to cupo ${competition.capacity}`,
    );
  }

  // Keep existing stations when set — WCIF "approxStations" is group size,
  // not physical stations (see inferStationCount docs).
  await saveCompetitionFormat(db, competition.id, {
    stationCount: competition.stationCount ?? stationCount,
    zoneCount: competition.zoneCount,
    eventsPlan: cappedPlan,
  });

  if (!wcaIdFromUrl(competition.wcaCompetitionUrl)) {
    await db
      .update(competitions)
      .set({
        wcaCompetitionUrl: `https://www.worldcubeassociation.org/competitions/${wcaId}`,
        updatedAt: new Date(),
      })
      .where(eq(competitions.id, competition.id));
  }

  console.log(
    `✅ Saved format: ${cappedPlan.length} events, stations=${stationCount}`,
  );
}

function estimateRecord(
  estimates: HorarioEventEstimate[],
): Record<string, HorarioEventEstimate> {
  const out: Record<string, HorarioEventEstimate> = {};
  for (const item of estimates) out[item.eventId] = item;
  return out;
}

function formatEstimateConstants(item: HorarioEventEstimate): string {
  return `{
    sampleSize: ${item.sampleSize},
    medianMinutesPerGroup: ${Number(item.medianMinutesPerGroup.toFixed(2))},
    medianMinutesPerCompetitor: ${Number(item.medianMinutesPerCompetitor.toFixed(4))},
    medianCompetitorsPerGroup: ${Number(item.medianCompetitorsPerGroup.toFixed(2))},
  }`;
}

function estimatesDataSource(data: HorarioEstimatesData): string {
  const nationalLines = Object.entries(data.national).map(
    ([eventId, item]) =>
      `    ${JSON.stringify(eventId)}: ${formatEstimateConstants(item)},`,
  );

  const regionBlocks = Object.entries(data.byRegion).map(
    ([regionId, events]) => {
      const eventLines = Object.entries(events).map(
        ([eventId, item]) =>
          `      ${JSON.stringify(eventId)}: ${formatEstimateConstants(item)},`,
      );
      return `    ${JSON.stringify(regionId)}: {\n${eventLines.join("\n")}\n    },`;
    },
  );

  return `/**
 * AUTO-GENERATED by \`pnpm --filter @workspace/db analyze:horario -- --write-estimates\`.
 * Do not edit by hand.
 */

import type { HorarioEstimatesData } from "./horario-estimates";

export const HORARIO_ESTIMATES_DATA: HorarioEstimatesData = {
  national: {
${nationalLines.join("\n")}
  },
  byRegion: {
${regionBlocks.join("\n")}
  },
  meta: {
    generatedAt: ${JSON.stringify(data.meta.generatedAt)},
    competitionCount: ${data.meta.competitionCount},
    roundCount: ${data.meta.roundCount},
  },
};
`;
}

async function listCachedCompetitionIds(): Promise<string[]> {
  try {
    const files = await readdir(CACHE_DIR);
    return files
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const competitionIds = new Set(args.comps);
  await loadCitiesCache();

  if (args.fromCache) {
    for (const id of await listCachedCompetitionIds()) {
      if (id === "cities") continue;
      competitionIds.add(id);
    }
  }

  if (args.mxYears != null) {
    console.log(`🇲🇽 Listing MX competitions (last ${args.mxYears} years)…`);
    for (const row of await listMexicoCompetitions(args.mxYears)) {
      competitionIds.add(row.id);
    }
  }

  const allRows: FlatRoundMetric[] = [];
  for (const id of competitionIds) {
    try {
      const wcif = args.fromCache
        ? ((await loadCachedWcif(id)) ??
          (() => {
            throw new Error(`No cache for ${id}`);
          })())
        : await fetchWcif(id);
      const location = await resolveLocationForCompetition(id);
      const rows = flattenWcifRounds(wcif, location);
      if (rows.length > 0) {
        const loc =
          location.regionId != null
            ? ` [${location.stateId ?? "?"}/${location.regionId}]`
            : "";
        console.log(
          `\n=== ${wcif.id} (${wcif.name ?? ""})${loc} — ${rows.length} rounds ===`,
        );
        console.log(formatRoundTable(rows));
        allRows.push(...rows);
      }

      if (args.seedBoard) {
        await seedBoardFromWcif(wcif);
      }
      if (!args.fromCache) await sleep(350);
    } catch (error) {
      console.error(
        `❌ ${id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  const aggregate = aggregateHorarioEstimates(allRows);
  console.log(
    `\n=== National medians (${aggregate.meta.competitionCount} comps, ${aggregate.meta.roundCount} rounds) ===`,
  );
  for (const row of aggregate.national) {
    console.log(
      `${row.eventId}\tn=${row.sampleSize}\tmin/group=${row.medianMinutesPerGroup.toFixed(1)}\tmin/comp=${row.medianMinutesPerCompetitor.toFixed(2)}\tcomp/group=${row.medianCompetitorsPerGroup.toFixed(1)}`,
    );
  }
  for (const [regionId, estimates] of Object.entries(aggregate.byRegion)) {
    console.log(`\n=== Region ${regionId} ===`);
    for (const row of estimates) {
      console.log(
        `${row.eventId}\tn=${row.sampleSize}\tmin/group=${row.medianMinutesPerGroup.toFixed(1)}`,
      );
    }
  }

  if (args.writeEstimates) {
    const data: HorarioEstimatesData = {
      national: estimateRecord(aggregate.national),
      byRegion: Object.fromEntries(
        Object.entries(aggregate.byRegion).map(([regionId, estimates]) => [
          regionId,
          estimateRecord(estimates),
        ]),
      ),
      meta: {
        generatedAt: new Date().toISOString(),
        competitionCount: aggregate.meta.competitionCount,
        roundCount: aggregate.meta.roundCount,
      },
    };
    const outPath = path.resolve(HERE, "horario-estimates-data.ts");
    await writeFile(outPath, estimatesDataSource(data), "utf8");
    console.log(`\n✅ Wrote ${outPath}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
