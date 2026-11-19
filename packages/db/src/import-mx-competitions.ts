/**
 * Wipe local competitions/boards and re-seed from real past Mexican WCA comps.
 *
 * Safety: refuses to run unless DATABASE_URL points at localhost/127.0.0.1
 * and `--wipe` is passed.
 *
 * Usage:
 *   pnpm --filter @workspace/db db:import-mx -- --wipe
 *   pnpm --filter @workspace/db db:import-mx -- --wipe --years 1 --boards 20
 */

import "./env";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { eq, inArray, sql } from "drizzle-orm";

import {
  cloneBoardFromTemplate,
  competitionBoardName,
} from "./clone-board";
import { saveCompetitionFormat } from "./competition-format";
import { resolveMexicoStateFromWcaCity } from "./data/mexico";
import { db } from "./index";
import {
  boards,
  competitionDelegates,
  competitions,
  user,
} from "./schema";
import {
  eventsPlanFromWcifMetrics,
  flattenWcifRounds,
} from "./wcif/flatten-rounds";
import type { Wcif } from "./wcif/types";

const WCA_COMPETITIONS_API =
  "https://www.worldcubeassociation.org/api/v0/competitions";
const WCA_WCIF_PUBLIC =
  "https://www.worldcubeassociation.org/api/v0/competitions";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(HERE, "../.cache/wcif");

type WcaCompetition = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  city: string;
  url: string;
  competitor_limit: number | null;
  cancelled_at: string | null;
  results_posted_at: string | null;
  announced_at: string | null;
  delegates?: Array<{ wca_id: string | null }>;
  organizers?: Array<{ wca_id: string | null }>;
};

type Args = {
  wipe: boolean;
  years: number;
  boards: number | null;
  limit: number | null;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  let wipe = false;
  let years = 1;
  let boards: number | null = null;
  let limit: number | null = null;
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--") continue;
    if (arg === "--wipe") wipe = true;
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--years") {
      const value = Number(argv[++i]);
      if (!Number.isFinite(value) || value < 1) {
        throw new Error("--years requires a positive number");
      }
      years = value;
    } else if (arg === "--boards") {
      const value = Number(argv[++i]);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error("--boards requires a non-negative number");
      }
      boards = value;
    } else if (arg === "--limit") {
      const value = Number(argv[++i]);
      if (!Number.isFinite(value) || value < 1) {
        throw new Error("--limit requires a positive number");
      }
      limit = value;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { wipe, years, boards, limit, dryRun };
}

function printUsage() {
  console.log(`Usage: db:import-mx -- --wipe [options]

Options:
  --wipe             Required. Delete all local competitions and non-template boards
  --years <n>        Past MX comps from the last n years (default: 1)
  --boards <n>       Only clone boards for the n most recent comps (default: all)
  --limit <n>        Cap how many competitions to import (most recent first)
  --dry-run          List what would be imported without writing
  --help             Show this help
`);
}

function assertLocalDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const host = new URL(url).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(
      `Refusing to wipe/import: DATABASE_URL host is «${host}» (expected localhost).`,
    );
  }
}

function mexicoCityToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function displayCity(wcaCity: string): string {
  const first = wcaCity.split(",")[0]?.trim();
  return first && first.length > 0 ? first : wcaCity.trim();
}

function isChampionshipName(name: string): boolean {
  return /championship|campeonato/i.test(name);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
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

async function listPastMexicoCompetitions(
  years: number,
): Promise<WcaCompetition[]> {
  const endIso = mexicoCityToday();
  const start = new Date(`${endIso}T12:00:00Z`);
  start.setUTCFullYear(start.getUTCFullYear() - years);
  const startIso = start.toISOString().slice(0, 10);
  const comps: WcaCompetition[] = [];

  for (let page = 1; page <= 20; page += 1) {
    const url = new URL(WCA_COMPETITIONS_API);
    url.searchParams.set("country_iso2", "MX");
    url.searchParams.set("start", startIso);
    url.searchParams.set("end", endIso);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    console.log(`⬇️  Listing MX comps page ${page} (${startIso}…${endIso})`);
    const response = await fetchWithRetry(url.toString());
    const rows = (await response.json()) as WcaCompetition[];
    if (rows.length === 0) break;

    for (const row of rows) {
      if (row.cancelled_at) continue;
      if (row.end_date > endIso) continue;
      comps.push(row);
    }
    if (rows.length < 100) break;
    await sleep(350);
  }

  comps.sort((a, b) => {
    if (a.end_date === b.end_date) return a.id.localeCompare(b.id);
    return a.end_date < b.end_date ? 1 : -1;
  });
  return comps;
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

async function fetchWcif(competitionId: string): Promise<Wcif> {
  const cached = await loadCachedWcif(competitionId);
  if (cached) {
    console.log(`📦 Cache hit ${competitionId}`);
    return cached;
  }

  const url = `${WCA_WCIF_PUBLIC}/${encodeURIComponent(competitionId)}/wcif/public`;
  console.log(`⬇️  WCIF ${competitionId}`);
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

async function wipeLocalCompetitionsAndBoards() {
  const [beforeComps] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(competitions);
  const [beforeBoards] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(boards)
    .where(eq(boards.isTemplate, false));

  console.log(
    `🧹 Wiping ${beforeComps?.n ?? 0} competitions and ${beforeBoards?.n ?? 0} non-template boards…`,
  );

  await db.transaction(async (tx) => {
    await tx
      .update(competitions)
      .set({ boardId: null, updatedAt: new Date() });
    await tx.delete(boards).where(eq(boards.isTemplate, false));
    await tx.delete(competitions);
  });

  const [afterComps] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(competitions);
  const [afterBoards] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(boards)
    .where(eq(boards.isTemplate, false));
  const [templates] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(boards)
    .where(eq(boards.isTemplate, true));

  console.log(
    `✅ Wipe done (comps=${afterComps?.n ?? 0}, boards=${afterBoards?.n ?? 0}, templates kept=${templates?.n ?? 0})`,
  );
}

async function localDelegateWcaIds(
  candidates: string[],
): Promise<Set<string>> {
  if (candidates.length === 0) return new Set();
  const rows = await db
    .select({ wcaId: user.wcaId })
    .from(user)
    .where(inArray(user.wcaId, candidates));
  return new Set(
    rows
      .map((row) => row.wcaId)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );
}

async function importCompetition(
  row: WcaCompetition,
  options: { withBoard: boolean },
): Promise<{ ok: true; id: number } | { ok: false; reason: string }> {
  const stateId = resolveMexicoStateFromWcaCity(row.city);
  if (!stateId) {
    return { ok: false, reason: `unresolved state for city «${row.city}»` };
  }

  const city = displayCity(row.city);
  const isChampionship = isChampionshipName(row.name);
  const capacity = row.competitor_limit && row.competitor_limit > 0
    ? row.competitor_limit
    : 50;

  const [created] = await db
    .insert(competitions)
    .values({
      name: row.name,
      city,
      stateId,
      wcaCompetitionUrl: row.url,
      startDate: row.start_date,
      endDate: row.end_date,
      capacity,
      isChampionship,
      statusPublic: "announced",
      statusInternal: "celebrated",
      notes: `Imported from WCA ${row.id}`,
      announcedPostedAt: row.announced_at ? new Date(row.announced_at) : null,
    })
    .returning({ id: competitions.id });

  if (!created) {
    return { ok: false, reason: "insert returned no row" };
  }

  const delegateCandidates = (row.delegates ?? [])
    .map((d) => d.wca_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const knownDelegates = await localDelegateWcaIds(delegateCandidates);
  const delegateIds = delegateCandidates.filter((id) => knownDelegates.has(id));
  if (delegateIds.length > 0) {
    await db.insert(competitionDelegates).values(
      delegateIds.map((wcaId, index) => ({
        competitionId: created.id,
        delegateWcaId: wcaId,
        isPrimary: index === 0,
        status: "accepted" as const,
      })),
    );
  }

  let wcif: Wcif | null = null;
  try {
    wcif = await fetchWcif(row.id);
    const metrics = flattenWcifRounds(wcif);
    const eventsPlan = eventsPlanFromWcifMetrics(metrics).map((item) => ({
      ...item,
      expectedCompetitors: Math.min(item.expectedCompetitors, capacity),
    }));
    // Do not infer stations from WCIF group size — that overcounts (packs
    // >1 competitor per station). Leave null for organizers to set.
    await saveCompetitionFormat(db, created.id, {
      stationCount: null,
      zoneCount: 1,
      eventsPlan,
    });
  } catch (error) {
    console.warn(
      `⚠️  ${row.id}: WCIF/format skipped —`,
      error instanceof Error ? error.message : error,
    );
  }

  if (options.withBoard) {
    await cloneBoardFromTemplate({
      competitionId: created.id,
      boardName: competitionBoardName({
        name: row.name,
        city,
        startDate: row.start_date,
      }),
      templateKey: isChampionship ? "championship" : "competition",
    });
  }

  return { ok: true, id: created.id };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertLocalDatabase();

  if (!args.wipe && !args.dryRun) {
    printUsage();
    throw new Error("Pass --wipe to delete local competitions/boards, or --dry-run.");
  }

  const listed = await listPastMexicoCompetitions(args.years);
  const importable: Array<{
    row: WcaCompetition;
    stateId: string;
  }> = [];
  const skipped: Array<{ id: string; reason: string }> = [];

  for (const row of listed) {
    const stateId = resolveMexicoStateFromWcaCity(row.city);
    if (!stateId) {
      skipped.push({ id: row.id, reason: `city «${row.city}»` });
      continue;
    }
    importable.push({ row, stateId });
  }

  const capped =
    args.limit != null ? importable.slice(0, args.limit) : importable;
  const boardCount =
    args.boards == null ? capped.length : Math.min(args.boards, capped.length);

  console.log(
    `\n🇲🇽 Past MX comps in window: ${listed.length}` +
      `\n   Importable: ${capped.length}` +
      `\n   Boards for most recent: ${boardCount}` +
      `\n   Skipped (no state): ${skipped.length}`,
  );
  if (skipped.length > 0) {
    for (const item of skipped.slice(0, 15)) {
      console.log(`   · skip ${item.id}: ${item.reason}`);
    }
    if (skipped.length > 15) {
      console.log(`   · …and ${skipped.length - 15} more`);
    }
  }

  console.log("\nMost recent to import:");
  for (const { row, stateId } of capped.slice(0, 12)) {
    console.log(
      `   ${row.end_date}  ${row.id}  [${stateId}]  ${row.name}`,
    );
  }
  if (capped.length > 12) {
    console.log(`   …and ${capped.length - 12} more`);
  }

  if (args.dryRun) {
    console.log("\n✅ Dry run only — no writes.");
    return;
  }

  await wipeLocalCompetitionsAndBoards();

  let ok = 0;
  let failed = 0;
  for (let i = 0; i < capped.length; i += 1) {
    const { row } = capped[i]!;
    const withBoard = i < boardCount;
    process.stdout.write(
      `\n[${i + 1}/${capped.length}] ${row.id}${withBoard ? " +board" : ""}… `,
    );
    try {
      const result = await importCompetition(row, { withBoard });
      if (result.ok) {
        ok += 1;
        console.log(`id=${result.id}`);
      } else {
        failed += 1;
        console.log(`FAILED: ${result.reason}`);
      }
    } catch (error) {
      failed += 1;
      console.log(
        `FAILED:`,
        error instanceof Error ? error.message : error,
      );
    }
    await sleep(200);
  }

  const [compCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(competitions);
  const [boardCountNow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(boards)
    .where(eq(boards.isTemplate, false));

  console.log(
    `\n✅ Done. imported_ok=${ok} failed=${failed} db_comps=${compCount?.n ?? 0} db_boards=${boardCountNow?.n ?? 0}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
