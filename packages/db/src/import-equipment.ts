import "./env";

import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { and, eq, inArray } from "drizzle-orm";

import { DEFAULT_EQUIPMENT_CATALOG } from "./data/equipment-catalog";
import {
  parseSku,
  registerAcquisition,
  syncSkuCounters,
  todayInMexico,
  type EquipmentDb,
} from "./equipment";
import {
  inferAcquisitionKind,
  inferSource,
  parseCategory,
  parseCsv,
  parseLooseDate,
  parseQuantity,
  parseStatus,
  parseTracking,
} from "./equipment-import";
import type { EquipmentAcquisitionKind } from "./equipment-labels";
import { db } from "./index";
import {
  equipmentAcquisitionKindEnum,
  equipmentAcquisitions,
  equipmentEvents,
  equipmentItems,
  equipmentStock,
  equipmentTypes,
  user,
} from "./schema";

const USAGE = `Uso: pnpm --filter @workspace/db db:import-equipment <carpeta> --actor <WCA ID> [--dry-run]

Archivos (todos opcionales, exportados de la hoja como CSV):
  types.csv         name,prefix,category,tracking[,sort_order]
                    Si falta, se usa el catálogo de la hoja actual.
  units.csv         sku,type,guardian_wca_id,status,source,notes
                    type = prefijo del tipo (DS3, DPQ, SG4…); status = Funcional/Defectuoso/…
  stock.csv         guardian_wca_id,type,quantity,notes
                    quantity es la cantidad total que resguarda (no un cambio).
  acquisitions.csv  date,description[,source][,kind],<PREFIJO>,<PREFIJO>…
                    date admite 2023-02-15, 2023-02, 2018, febrero-2023, 2014-2015.

Volver a correrlo actualiza lo que cambió y no duplica nada.`;

const IMPORT_DESCRIPTION = "Inventario inicial importado de la hoja";
const IMPORT_REASON = "Importación de hoja de inventario";

class DryRun extends Error {}

function parseArgs(argv: string[]) {
  const args = { dir: "", actor: "", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--actor") args.actor = argv[++i] ?? "";
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      process.exit(0);
    } else if (!args.dir) args.dir = arg;
  }
  if (!args.dir || !args.actor) {
    console.error(USAGE);
    process.exit(1);
  }
  return args;
}

async function readCsv(dir: string, name: string) {
  try {
    return parseCsv(await readFile(join(dir, name), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function kindForSource(source: string): EquipmentAcquisitionKind {
  if (source === "AMS") return "purchase";
  if (/wca/i.test(source)) return "donation";
  return "sponsorship";
}

async function importTypes(
  tx: EquipmentDb,
  rows: Record<string, string>[] | null,
) {
  const entries = rows
    ? rows.map((row, i) => ({
        name: row.name!,
        prefix: row.prefix!.toUpperCase(),
        category: parseCategory(row.category ?? ""),
        tracking: parseTracking(row.tracking ?? ""),
        sortOrder: row.sort_order ? Number(row.sort_order) : i * 10,
      }))
    : DEFAULT_EQUIPMENT_CATALOG.map((entry, i) => ({
        ...entry,
        sortOrder: i * 10,
      }));

  let created = 0;
  for (const entry of entries) {
    if (!entry.name || !entry.prefix) {
      throw new Error("types.csv: cada fila necesita name y prefix");
    }
    const [existing] = await tx
      .select()
      .from(equipmentTypes)
      .where(eq(equipmentTypes.skuPrefix, entry.prefix));
    if (existing) {
      await tx
        .update(equipmentTypes)
        .set({
          name: entry.name,
          category: entry.category,
          tracking: entry.tracking,
          sortOrder: entry.sortOrder,
        })
        .where(eq(equipmentTypes.id, existing.id));
    } else {
      await tx.insert(equipmentTypes).values({
        name: entry.name,
        skuPrefix: entry.prefix,
        category: entry.category,
        tracking: entry.tracking,
        sortOrder: entry.sortOrder,
      });
      created++;
    }
  }

  const all = await tx.select().from(equipmentTypes);
  return {
    created,
    byPrefix: new Map(all.map((type) => [type.skuPrefix, type])),
  };
}

async function resolveGuardians(tx: EquipmentDb, wcaIds: string[]) {
  const unique = [...new Set(wcaIds.map((id) => id.toUpperCase()))];
  if (unique.length === 0) return new Map<string, string>();
  const rows = await tx
    .select({ id: user.id, wcaId: user.wcaId })
    .from(user)
    .where(inArray(user.wcaId, unique));
  const map = new Map(rows.map((row) => [row.wcaId!.toUpperCase(), row.id]));
  const missing = unique.filter((id) => !map.has(id));
  if (missing.length) {
    throw new Error(
      `Estos guardianes no tienen cuenta todavía: ${missing.join(", ")}. ` +
        "Pídeles iniciar sesión una vez o agrégalos desde el panel.",
    );
  }
  return map;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dir = resolve(process.cwd(), args.dir);
  const [typeRows, unitRows, stockRows, acquisitionRows] = await Promise.all([
    readCsv(dir, "types.csv"),
    readCsv(dir, "units.csv"),
    readCsv(dir, "stock.csv"),
    readCsv(dir, "acquisitions.csv"),
  ]);

  const [actor] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.wcaId, args.actor.toUpperCase()));
  if (!actor) throw new Error(`No existe un usuario con WCA ID ${args.actor}`);

  const summary = {
    typesCreated: 0,
    unitsCreated: 0,
    unitsUpdated: 0,
    stockChanged: 0,
    acquisitionsCreated: 0,
    counters: 0,
  };

  try {
    await db.transaction(async (tx) => {
      const { created, byPrefix } = await importTypes(tx, typeRows);
      summary.typesCreated = created;

      const typeFor = (prefix: string, file: string) => {
        const type = byPrefix.get(prefix.trim().toUpperCase());
        if (!type) throw new Error(`${file}: tipo desconocido "${prefix}"`);
        return type;
      };

      const guardians = await resolveGuardians(
        tx,
        [
          ...(unitRows ?? []).map((row) => row.guardian_wca_id ?? ""),
          ...(stockRows ?? []).map((row) => row.guardian_wca_id ?? ""),
        ].filter(Boolean),
      );
      const guardianFor = (wcaId: string) =>
        wcaId ? guardians.get(wcaId.toUpperCase())! : null;

      // Units --------------------------------------------------------------
      const sourceAcquisitions = new Map<string, number>();
      const acquisitionForSource = async (source: string) => {
        const cached = sourceAcquisitions.get(source);
        if (cached) return cached;
        const [existing] = await tx
          .select({ id: equipmentAcquisitions.id })
          .from(equipmentAcquisitions)
          .where(
            and(
              eq(equipmentAcquisitions.description, IMPORT_DESCRIPTION),
              eq(equipmentAcquisitions.source, source),
            ),
          );
        const id =
          existing?.id ??
          (
            await tx
              .insert(equipmentAcquisitions)
              .values({
                date: todayInMexico(),
                description: IMPORT_DESCRIPTION,
                source,
                kind: kindForSource(source),
                createdByUserId: actor.id,
              })
              .returning({ id: equipmentAcquisitions.id })
          )[0]!.id;
        sourceAcquisitions.set(source, id);
        return id;
      };

      for (const [index, row] of (unitRows ?? []).entries()) {
        const line = `units.csv fila ${index + 2}`;
        const sku = (row.sku ?? "").trim().toUpperCase();
        if (!parseSku(sku))
          throw new Error(`${line}: SKU inválido "${row.sku}"`);
        const type = typeFor(row.type ?? parseSku(sku)!.prefix, line);
        if (type.tracking !== "serialized") {
          throw new Error(`${line}: ${type.name} se maneja por cantidad`);
        }
        const values = {
          typeId: type.id,
          guardianUserId: guardianFor(row.guardian_wca_id ?? ""),
          status: parseStatus(row.status ?? ""),
          notes: row.notes || null,
          acquisitionId: await acquisitionForSource(row.source || "AMS"),
        };

        const [existing] = await tx
          .select()
          .from(equipmentItems)
          .where(eq(equipmentItems.sku, sku));
        if (!existing) {
          const [item] = await tx
            .insert(equipmentItems)
            .values({ sku, ...values })
            .returning({ id: equipmentItems.id });
          await tx.insert(equipmentEvents).values({
            action: "item_created",
            actorId: actor.id,
            itemId: item!.id,
            typeId: type.id,
            guardianUserId: values.guardianUserId,
            toUserId: values.guardianUserId,
            acquisitionId: values.acquisitionId,
            details: { sku, imported: true },
          });
          summary.unitsCreated++;
          continue;
        }

        const changes: Record<string, { before: unknown; after: unknown }> = {};
        for (const key of Object.keys(values) as (keyof typeof values)[]) {
          if (existing[key] !== values[key]) {
            changes[key] = { before: existing[key], after: values[key] };
          }
        }
        if (Object.keys(changes).length === 0) continue;
        await tx
          .update(equipmentItems)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(equipmentItems.id, existing.id));
        await tx.insert(equipmentEvents).values({
          action: changes.guardianUserId ? "transferred" : "item_updated",
          actorId: actor.id,
          itemId: existing.id,
          typeId: type.id,
          guardianUserId: values.guardianUserId,
          fromUserId: changes.guardianUserId ? existing.guardianUserId : null,
          toUserId: changes.guardianUserId ? values.guardianUserId : null,
          details: { ...changes, imported: true },
        });
        summary.unitsUpdated++;
      }

      // Stock --------------------------------------------------------------
      for (const [index, row] of (stockRows ?? []).entries()) {
        const line = `stock.csv fila ${index + 2}`;
        const type = typeFor(row.type ?? "", line);
        if (type.tracking !== "bulk") {
          throw new Error(
            `${line}: ${type.name} se registra por unidad en units.csv`,
          );
        }
        const guardianUserId = guardianFor(row.guardian_wca_id ?? "");
        if (!guardianUserId) throw new Error(`${line}: falta guardian_wca_id`);
        const quantity = parseQuantity(row.quantity ?? "", line);
        if (quantity < 0)
          throw new Error(`${line}: la cantidad no puede ser negativa`);
        const notes = row.notes || null;

        const [existing] = await tx
          .select()
          .from(equipmentStock)
          .where(
            and(
              eq(equipmentStock.typeId, type.id),
              eq(equipmentStock.guardianUserId, guardianUserId),
            ),
          );
        const before = existing?.quantity ?? 0;
        if (existing && before === quantity && existing.notes === notes)
          continue;

        await tx
          .insert(equipmentStock)
          .values({ typeId: type.id, guardianUserId, quantity, notes })
          .onConflictDoUpdate({
            target: [equipmentStock.typeId, equipmentStock.guardianUserId],
            set: { quantity, notes, updatedAt: new Date() },
          });
        await tx.insert(equipmentEvents).values({
          action: "stock_adjusted",
          actorId: actor.id,
          typeId: type.id,
          guardianUserId,
          quantityDelta: quantity - before,
          details: {
            reason: IMPORT_REASON,
            before,
            after: quantity,
            imported: true,
          },
        });
        summary.stockChanged++;
      }

      // Acquisitions -------------------------------------------------------
      const reserved = new Set(["date", "description", "source", "kind"]);
      for (const [index, row] of (acquisitionRows ?? []).entries()) {
        const line = `acquisitions.csv fila ${index + 2}`;
        const description = row.description?.trim();
        if (!description) continue;
        const date = parseLooseDate(row.date ?? "");
        const ledger = Object.entries(row)
          .filter(([key, value]) => !reserved.has(key) && value.trim())
          .map(([key, value]) => ({
            typeId: typeFor(key, line).id,
            quantityDelta: parseQuantity(value, `${line} (${key})`),
          }))
          .filter((entry) => entry.quantityDelta !== 0);

        const [existing] = await tx
          .select({ id: equipmentAcquisitions.id })
          .from(equipmentAcquisitions)
          .where(
            and(
              eq(equipmentAcquisitions.date, date),
              eq(equipmentAcquisitions.description, description),
            ),
          );
        if (existing) continue;

        const total = ledger.reduce(
          (sum, entry) => sum + entry.quantityDelta,
          0,
        );
        const kinds =
          equipmentAcquisitionKindEnum.enumValues as readonly string[];
        if (row.kind && !kinds.includes(row.kind)) {
          throw new Error(`${line}: kind debe ser ${kinds.join(", ")}`);
        }
        await registerAcquisition(tx, {
          actorId: actor.id,
          date,
          description,
          source: row.source || inferSource(description),
          kind: row.kind
            ? (row.kind as EquipmentAcquisitionKind)
            : inferAcquisitionKind(description, total),
          lines: [],
          ledgerOnly: ledger,
        });
        summary.acquisitionsCreated++;
      }

      summary.counters = await syncSkuCounters(tx);

      if (args.dryRun) throw new DryRun();
    });
  } catch (error) {
    if (!(error instanceof DryRun)) throw error;
    console.log("🔎 Simulación: no se guardó nada.");
  }

  console.log(
    [
      `Tipos nuevos: ${summary.typesCreated}`,
      `Unidades nuevas: ${summary.unitsCreated}`,
      `Unidades actualizadas: ${summary.unitsUpdated}`,
      `Cantidades cambiadas: ${summary.stockChanged}`,
      `Adquisiciones nuevas: ${summary.acquisitionsCreated}`,
      `Contadores de SKU sincronizados: ${summary.counters}`,
      `Registrado como: ${actor.name}`,
    ].join("\n"),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Importación de equipo fallida");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
