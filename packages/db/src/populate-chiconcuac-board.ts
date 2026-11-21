/**
 * Fill the local Chiconcuac 2026 board with as much real WCA/WCIF data as possible.
 *
 * Usage: pnpm --filter @workspace/db exec tsx src/populate-chiconcuac-board.ts
 */

import "./env";

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { and, asc, eq, ilike, inArray, sql } from "drizzle-orm";

import { addCompetitionStaff } from "./competition-staff";
import { saveCompetitionFormat } from "./competition-format";
import { mexicoStateById } from "./data/mexico";
import { db } from "./index";
import {
  boardLists,
  boardMembers,
  boards,
  cardAttachments,
  cardComments,
  cards,
  checklistItems,
  checklists,
  competitionDelegates,
  competitionOrganizers,
  competitions,
  user,
} from "./schema";
import type { StaffActivity } from "./staff-labels";
import {
  eventsPlanFromWcifMetrics,
  flattenWcifRounds,
} from "./wcif/flatten-rounds";
import type { Wcif, WcifActivity } from "./wcif/types";

const WCA_ID = "Chiconcuac2026";
const WCA_API = "https://www.worldcubeassociation.org/api/v0/competitions";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.resolve(HERE, `../.cache/wcif/${WCA_ID}.json`);

type WcaCompetition = {
  id: string;
  name: string;
  city: string;
  venue: string | null;
  venue_address: string | null;
  venue_details: string | null;
  url: string;
  website: string | null;
  competitor_limit: number | null;
  main_event_id: string | null;
  start_date: string;
  end_date: string;
  information: string | null;
  contact: string | null;
  base_entry_fee_lowest_denomination: number | null;
  currency_code: string | null;
  registration_open: string | null;
  registration_close: string | null;
  announced_at: string | null;
  results_posted_at: string | null;
  event_ids: string[];
  delegates: Array<{ wca_id: string | null; name: string }>;
  organizers: Array<{ wca_id: string | null; name: string }>;
};

type WcifPerson = {
  name: string;
  wcaId?: string | null;
  email?: string | null;
  roles?: string[];
};

const ROLE_TO_ACTIVITIES: Record<string, StaffActivity[]> = {
  "staff-judge": ["judge"],
  "staff-scrambler": ["scrambler"],
  "staff-runner": ["runner"],
  "staff-dataentry": ["data_entry"],
  "staff-data-entry": ["data_entry"],
  "staff-registration": ["registration"],
};

function assertLocalDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const host = new URL(url).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`Refusing to populate: host is «${host}»`);
  }
}

function plainTextFromWcaMarkup(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/[*_~`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMarkdownImageUrl(markdown: string | null | undefined): string | null {
  if (!markdown) return null;
  const match = markdown.match(/!\[[^\]]*]\(([^)]+)\)/);
  return match?.[1] ?? null;
}

function extractMapsUrl(venue: string | null | undefined): string | null {
  if (!venue) return null;
  const match = venue.match(/\((https?:\/\/[^)]+)\)/);
  return match?.[1] ?? null;
}

function walkActivities(
  activities: WcifActivity[] | undefined,
  out: WcifActivity[] = [],
): WcifActivity[] {
  for (const activity of activities ?? []) {
    out.push(activity);
    walkActivities(activity.childActivities, out);
  }
  return out;
}

function formatMexicoTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Mexico_City",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function scheduleMarkdown(wcif: Wcif): string {
  const lines: string[] = ["**Horario (WCIF público)**", ""];
  for (const venue of wcif.schedule?.venues ?? []) {
    for (const room of venue.rooms ?? []) {
      lines.push(`### ${room.name?.trim() || "Sala"}`);
      const activities = walkActivities(room.activities).filter(
        (activity) =>
          !activity.childActivities || activity.childActivities.length === 0,
      );
      activities.sort(
        (a, b) => Date.parse(a.startTime) - Date.parse(b.startTime),
      );
      for (const activity of activities) {
        lines.push(
          `- ${formatMexicoTime(activity.startTime)} → ${formatMexicoTime(activity.endTime)} — ${activity.name ?? activity.activityCode}`,
        );
      }
      lines.push("");
    }
  }
  return lines.join("\n").trim();
}

function staffFromWcif(persons: WcifPerson[]): Array<{
  name: string;
  wcaId: string | null;
  email: string | null;
  activities: StaffActivity[];
}> {
  const out: Array<{
    name: string;
    wcaId: string | null;
    email: string | null;
    activities: StaffActivity[];
  }> = [];

  for (const person of persons) {
    const roles = person.roles ?? [];
    const activities = new Set<StaffActivity>();
    for (const role of roles) {
      for (const activity of ROLE_TO_ACTIVITIES[role] ?? []) {
        activities.add(activity);
      }
    }
    if (activities.size === 0) continue;
    out.push({
      name: person.name,
      wcaId: person.wcaId?.trim().toUpperCase() || null,
      email: person.email?.trim().toLowerCase() || null,
      activities: [...activities],
    });
  }

  return out;
}

async function loadWcif(): Promise<Wcif & { persons?: WcifPerson[] }> {
  try {
    const raw = await readFile(CACHE_PATH, "utf8");
    return JSON.parse(raw) as Wcif & { persons?: WcifPerson[] };
  } catch {
    const response = await fetch(`${WCA_API}/${WCA_ID}/wcif/public`);
    if (!response.ok) throw new Error(`WCIF HTTP ${response.status}`);
    return (await response.json()) as Wcif & { persons?: WcifPerson[] };
  }
}

async function ensureUser(input: {
  wcaId: string;
  name: string;
  emailHint?: string | null;
}): Promise<{ id: string; created: boolean }> {
  const existing = await db.query.user.findFirst({
    where: eq(user.wcaId, input.wcaId),
    columns: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const id = randomUUID();
  const email =
    input.emailHint?.trim().toLowerCase() ||
    `${input.wcaId.toLowerCase()}@wca.local.stub`;

  await db.insert(user).values({
    id,
    name: input.name,
    email,
    emailVerified: true,
    wcaId: input.wcaId,
    role: "user",
  });
  return { id, created: true };
}

async function cardByTitle(boardId: number, title: string) {
  const rows = await db
    .select({
      id: cards.id,
      title: cards.title,
      listId: cards.listId,
      listTitle: boardLists.title,
    })
    .from(cards)
    .innerJoin(boardLists, eq(boardLists.id, cards.listId))
    .where(and(eq(boardLists.boardId, boardId), eq(cards.title, title)))
    .limit(1);
  return rows[0] ?? null;
}

async function moveCardToList(
  cardId: number,
  listId: number,
  position: number,
) {
  await db
    .update(cards)
    .set({ listId, position, updatedAt: new Date() })
    .where(eq(cards.id, cardId));
}

async function ensureComment(
  cardId: number,
  authorId: string,
  body: string,
) {
  const existing = await db.query.cardComments.findFirst({
    where: and(eq(cardComments.cardId, cardId), eq(cardComments.body, body)),
    columns: { id: true },
  });
  if (existing) return false;
  await db.insert(cardComments).values({ cardId, authorId, body });
  return true;
}

async function ensureAttachment(cardId: number, name: string, url: string) {
  const existing = await db.query.cardAttachments.findFirst({
    where: and(eq(cardAttachments.cardId, cardId), eq(cardAttachments.name, name)),
    columns: { id: true },
  });
  if (existing) {
    await db
      .update(cardAttachments)
      .set({ url })
      .where(eq(cardAttachments.id, existing.id));
    return;
  }
  await db.insert(cardAttachments).values({ cardId, name, url });
}

async function completeAllChecklists(cardId: number) {
  const lists = await db
    .select({ id: checklists.id })
    .from(checklists)
    .where(eq(checklists.cardId, cardId));
  if (lists.length === 0) return 0;
  const result = await db
    .update(checklistItems)
    .set({ done: true })
    .where(
      inArray(
        checklistItems.checklistId,
        lists.map((list) => list.id),
      ),
    )
    .returning({ id: checklistItems.id });
  return result.length;
}

async function main() {
  assertLocalDatabase();

  console.log(`⬇️  Fetching WCA + WCIF for ${WCA_ID}`);
  const [wcaRes, wcif] = await Promise.all([
    fetch(`${WCA_API}/${WCA_ID}`),
    loadWcif(),
  ]);
  if (!wcaRes.ok) throw new Error(`WCA HTTP ${wcaRes.status}`);
  const wca = (await wcaRes.json()) as WcaCompetition;

  const competition = await db.query.competitions.findFirst({
    where: ilike(
      competitions.wcaCompetitionUrl,
      `%/competitions/${WCA_ID}%`,
    ),
  });
  if (!competition) {
    throw new Error("Chiconcuac 2026 competition not found locally");
  }
  if (!competition.boardId) {
    throw new Error("Chiconcuac 2026 has no board");
  }

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, competition.boardId),
  });
  if (!board) throw new Error("Board row missing");

  const lists = await db
    .select()
    .from(boardLists)
    .where(eq(boardLists.boardId, board.id))
    .orderBy(asc(boardLists.position));
  const listByTitle = new Map(lists.map((list) => [list.title, list]));
  const hecho = listByTitle.get("Hecho");
  const aprobado = listByTitle.get("Aprobado");
  if (!hecho || !aprobado) {
    throw new Error("Expected Hecho and Aprobado lists");
  }

  const actor =
    (await db.query.user.findFirst({
      where: eq(user.wcaId, "2015CARD01"),
      columns: { id: true, name: true },
    })) ??
    (await db.query.user.findFirst({
      where: eq(user.role, "delegate"),
      columns: { id: true, name: true },
    }));
  if (!actor) throw new Error("No local delegate user to author comments");

  const metrics = flattenWcifRounds(wcif);
  const eventsPlan = eventsPlanFromWcifMetrics(metrics).map((item) => ({
    ...item,
    expectedCompetitors: Math.min(
      item.expectedCompetitors,
      wca.competitor_limit ?? competition.capacity,
    ),
  }));
  // Real station count for Chiconcuac 2026 (WCIF group size ≠ stations).
  const stationCount = 10;
  const capacity = wca.competitor_limit ?? competition.capacity;
  const flyerUrl = extractMarkdownImageUrl(wca.information);
  const mapsUrl = extractMapsUrl(wca.venue);
  const venueName =
    plainTextFromWcaMarkup(wca.venue_details) ||
    plainTextFromWcaMarkup(wca.venue) ||
    "Sede";
  const venueAddress = plainTextFromWcaMarkup(wca.venue_address);
  const stateName = mexicoStateById(competition.stateId)?.name ?? competition.stateId;
  const feeMxn =
    wca.base_entry_fee_lowest_denomination != null &&
    wca.currency_code === "MXN"
      ? (wca.base_entry_fee_lowest_denomination / 100).toFixed(0)
      : null;

  console.log("→ Updating competition details / format / social");
  await saveCompetitionFormat(db, competition.id, {
    stationCount,
    zoneCount: Math.max(1, competition.zoneCount || 1),
    eventsPlan,
  });

  await db
    .update(competitions)
    .set({
      name: wca.name,
      nameReason:
        "Chiconcuac, «Lugar de las siete serpientes» (Estado de México). Competencia Team EdoMex.",
      city: "Chiconcuac",
      capacity,
      mainEventId: wca.main_event_id || "333",
      wcaCompetitionUrl: wca.url,
      statusPublic: "announced",
      statusInternal: "celebrated",
      notes: [
        `Importado/poblado desde WCA ${WCA_ID}.`,
        feeMxn ? `Cuota WCA: $${feeMxn} MXN.` : null,
        wca.contact ? `Contacto: ${plainTextFromWcaMarkup(wca.contact)}.` : null,
        wca.results_posted_at
          ? `Resultados publicados: ${wca.results_posted_at}.`
          : null,
      ]
        .filter(Boolean)
        .join(" "),
      socialCustomText: [
        "¡Bienvenido a Chiconcuac 2026!",
        "Team EdoMex te invita a esta competencia oficial en Chiconcuac, Lugar de las siete serpientes.",
        "Ven a poner a prueba tus habilidades, conocer a otros apasionados del cubo y disfrutar en comunidad.",
      ].join("\n\n"),
      socialTags: [
        "#Chiconcuac2026",
        "#TeamEdoMex",
        "#AMSCubing",
        "#WCA",
        "#Speedcubing",
        ...wca.event_ids.map((id) => `#${id}`),
      ].join(" "),
      socialFlyerUrl: flyerUrl,
      socialPublishedManually: true,
      announcedPostedAt: wca.announced_at
        ? new Date(wca.announced_at)
        : competition.announcedPostedAt,
      updatedAt: new Date(),
    })
    .where(eq(competitions.id, competition.id));

  // Delegates
  console.log("→ Delegates");
  await db
    .delete(competitionDelegates)
    .where(eq(competitionDelegates.competitionId, competition.id));
  const localDelegateIds: string[] = [];
  for (const [index, delegate] of (wca.delegates ?? []).entries()) {
    if (!delegate.wca_id) continue;
    const ensured = await ensureUser({
      wcaId: delegate.wca_id,
      name: delegate.name,
    });
    // Only assign if they are already a delegate role, else still create user
    // but competition_delegate requires FK to user.wcaId — OK even if role=user.
    // Prefer promoting known seed delegates only; keep FK happy.
    localDelegateIds.push(delegate.wca_id);
    const local = await db.query.user.findFirst({
      where: eq(user.wcaId, delegate.wca_id),
      columns: { role: true },
    });
    if (local?.role !== "delegate") {
      console.warn(
        `  · ${delegate.wca_id} exists as ${local?.role}; assigning as competition delegate anyway`,
      );
    }
    await db.insert(competitionDelegates).values({
      competitionId: competition.id,
      delegateWcaId: delegate.wca_id,
      isPrimary: index === 0,
      status: "accepted",
    });
    void ensured;
  }

  // Organizers
  console.log("→ Organizers");
  await db
    .delete(competitionOrganizers)
    .where(eq(competitionOrganizers.competitionId, competition.id));
  const organizerUserIds: string[] = [];
  for (const [index, organizer] of (wca.organizers ?? []).entries()) {
    if (!organizer.wca_id) continue;
    const ensured = await ensureUser({
      wcaId: organizer.wca_id,
      name: organizer.name,
    });
    organizerUserIds.push(ensured.id);
    await db.insert(competitionOrganizers).values({
      competitionId: competition.id,
      organizerUserId: ensured.id,
      isPrimary: index === 0,
    });
    if (ensured.created) console.log(`  · stub user ${organizer.wca_id}`);
  }

  // Board members: delegate + organizers
  console.log("→ Board members");
  const memberIds = new Set<string>([actor.id, ...organizerUserIds]);
  for (const userId of memberIds) {
    await db
      .insert(boardMembers)
      .values({ boardId: board.id, userId })
      .onConflictDoNothing();
  }

  // Staff roster
  console.log("→ Staff roster from WCIF");
  await db.execute(
    sql`delete from competition_staff_member where competition_id = ${competition.id}`,
  );
  const staff = staffFromWcif(wcif.persons ?? []);
  let staffAdded = 0;
  for (const member of staff) {
    try {
      await addCompetitionStaff(db, {
        competitionId: competition.id,
        actorId: actor.id,
        member: {
          name: member.name,
          wcaId: member.wcaId,
          email: member.email,
          activities: member.activities,
        },
      });
      staffAdded += 1;
    } catch (error) {
      console.warn(
        `  · skip ${member.name}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  console.log(`  · ${staffAdded}/${staff.length} staff members`);

  // Card content
  const byTitle = async (title: string) => {
    const card = await cardByTitle(board.id, title);
    if (!card) console.warn(`  · missing card «${title}»`);
    return card;
  };

  const details = await byTitle("Detalles de competencia");
  const venue = await byTitle("Permiso de sede");
  const categories = await byTitle("Categorías");
  const schedule = await byTitle("Horario");
  const mapping = await byTitle("Mapeo de sede");
  const staffPlan = await byTitle("Planeación de Staff");
  const staffTrain = await byTitle("Organización/Capacitación de staff");
  const costs = await byTitle("Excel de Costos");
  const wcaCard = await byTitle("Sitio web (WCA)");
  const social = await byTitle("Publicación redes Torneo de Rubik");
  const designs = await byTitle("Diseños");
  const registration = await byTitle("Realizar inscripción");
  const equipment = await byTitle("Confirmación de equipo de competencia");
  const results = await byTitle("Captura de Resultados");
  const organizerDuties = await byTitle("Responsabilidades del Organizador");
  const groups = await byTitle("Organiza grupos, imprime papeletas");
  const emailPrep = await byTitle("Preparación registro y Correo Informativo");
  const finalEmail = await byTitle("Correo Final y Encuesta de Calidad");
  const firstCosts = await byTitle("Entregar del primer avance de Costos");
  const finalCosts = await byTitle("Entregar informe de costos final");
  const sponsors = await byTitle("Patrocinios y convenios");

  console.log("→ Card comments / attachments / checklists");

  if (details) {
    await ensureComment(
      details.id,
      actor.id,
      [
        "**Detalles confirmados (WCA)**",
        `- Nombre: ${wca.name}`,
        `- Fechas: ${wca.start_date} → ${wca.end_date}`,
        `- Ciudad: Chiconcuac, ${stateName}`,
        `- Cupo: ${capacity}`,
        `- Estaciones (inferidas WCIF): ${stationCount}`,
        `- Evento principal: ${wca.main_event_id || "333"}`,
        `- Categorías: ${wca.event_ids.join(", ")}`,
        feeMxn ? `- Cuota: $${feeMxn} MXN` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
    if (flyerUrl) {
      await db
        .update(cards)
        .set({ coverUrl: flyerUrl, updatedAt: new Date() })
        .where(eq(cards.id, details.id));
      await ensureAttachment(details.id, "Flyer / banner WCA", flyerUrl);
    }
  }

  if (venue) {
    const checked = await completeAllChecklists(venue.id);
    console.log(`  · venue checklist items done: ${checked}`);
    await ensureComment(
      venue.id,
      actor.id,
      [
        "**Sede confirmada (WCA)**",
        `- Nombre: ${venueName}`,
        `- Dirección: ${venueAddress}`,
        mapsUrl ? `- Maps: ${mapsUrl}` : null,
        `- Encargado / contacto org: ${plainTextFromWcaMarkup(wca.contact) || "rubikedomex@gmail.com"}`,
        "- Mobiliario: auditorio municipal; zona única (Auditorio Principal).",
        "- Permiso: competencia ya celebrada; checklist mínimos marcados para demo local.",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    if (mapsUrl) {
      await ensureAttachment(venue.id, "Google Maps sede", mapsUrl);
    }
  }

  if (categories) {
    await ensureComment(
      categories.id,
      actor.id,
      [
        "**Formato técnico desde WCIF**",
        ...eventsPlan.map(
          (item) =>
            `- ${item.eventId}: ${item.expectedCompetitors} esperados, ${item.rounds} ronda(s)` +
            (item.cutoffCs != null ? `, corte ${item.cutoffCs} cs` : "") +
            (item.timeLimitCs != null ? `, límite ${item.timeLimitCs} cs` : ""),
        ),
        "",
        `Estaciones: ${stationCount}. Zonas: 1.`,
      ].join("\n"),
    );
  }

  if (schedule) {
    await ensureComment(schedule.id, actor.id, scheduleMarkdown(wcif));
    await ensureAttachment(
      schedule.id,
      "WCIF público",
      `${wca.url}/#/schedule`,
    );
  }

  if (mapping) {
    await ensureComment(
      mapping.id,
      actor.id,
      [
        "**Mapeo (resumen)**",
        `- Sala: Auditorio Principal (${venueName})`,
        "- Zona de competencia + espectadores en el mismo salón (zona única).",
        "- Mezcla aislada visualmente al costado del escenario.",
        "- Registro / captura cerca de la entrada.",
        mapsUrl ? `- Referencia: ${mapsUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (staffPlan) {
    await ensureComment(
      staffPlan.id,
      actor.id,
      [
        "**Staff comprometido (roles WCIF)**",
        `- ${staffAdded} personas con actividades de juez / mezclador / corredor / etc.`,
        "- Lista cargada en la sección Staff de esta tarjeta.",
        "- Beneficios planeados: comida, hidratación y reconocimiento de staff.",
        "- Capacitación: curso AMS Capacitación de Staff + briefing el día previo.",
      ].join("\n"),
    );
  }

  if (staffTrain) {
    await ensureComment(
      staffTrain.id,
      actor.id,
      [
        "**Capacitación**",
        "- Briefing de reglamento y flujo de estaciones el viernes previo.",
        "- Roles asignados vía Groupifier según la lista de Planeación de Staff.",
        "- Montaje / desmontaje obligatorios para beneficios.",
      ].join("\n"),
    );
  }

  if (costs) {
    await ensureComment(
      costs.id,
      actor.id,
      [
        "**Costos (resumen demo)**",
        feeMxn ? `- Inscripción WCA: $${feeMxn} MXN` : null,
        "- Sede: donación en especie / convenio municipal.",
        "- Equipo AMS: timers + displays sin costo (préstamo de delegado).",
        "- Cuotas WCA/AMS 5% contempladas sobre registros.",
        "- Drive de costos: (demo local) documento compartido con el delegado.",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (wcaCard) {
    await ensureComment(
      wcaCard.id,
      actor.id,
      [
        "**Sitio WCA**",
        `- URL: ${wca.url}`,
        `- Anuncio: ${wca.announced_at ?? "—"}`,
        `- Registro: ${wca.registration_open ?? "—"} → ${wca.registration_close ?? "—"}`,
        `- Resultados: ${wca.results_posted_at ?? "—"}`,
      ].join("\n"),
    );
    await ensureAttachment(wcaCard.id, "Competencia WCA", wca.url);
  }

  if (social) {
    await ensureComment(
      social.id,
      actor.id,
      [
        "**Publicación redes**",
        "- Texto y hashtags guardados en la sección de la tarjeta.",
        flyerUrl ? "- Flyer adjunto desde el banner WCA." : null,
        "- Marcado como publicado manualmente (competencia ya anunciada).",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    if (flyerUrl) {
      await ensureAttachment(social.id, "Flyer redes", flyerUrl);
      await db
        .update(cards)
        .set({ coverUrl: flyerUrl, updatedAt: new Date() })
        .where(eq(cards.id, social.id));
    }
  }

  if (designs) {
    await ensureComment(
      designs.id,
      actor.id,
      [
        "**Diseños**",
        "- Logo / banner publicados en el sitio WCA.",
        "- Gafetes con ID de competidor impresos previo al evento.",
        "- Diplomas y reconocimientos listos para premiación.",
        flyerUrl ? `- Banner: ${flyerUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
    if (flyerUrl) {
      await ensureAttachment(designs.id, "Banner competencia", flyerUrl);
      await db
        .update(cards)
        .set({ coverUrl: flyerUrl, updatedAt: new Date() })
        .where(eq(cards.id, designs.id));
    }
  }

  if (registration) {
    await ensureComment(
      registration.id,
      actor.id,
      [
        "**Inscripción**",
        `- Cupo ${capacity}; registro WCA abierto ${wca.registration_open ?? "—"} → cerrado ${wca.registration_close ?? "—"}.`,
        `- Contacto org: ${plainTextFromWcaMarkup(wca.contact) || "rubikedomex@gmail.com"}`,
        `- Personas en WCIF: ${(wcif.persons ?? []).length}`,
      ].join("\n"),
    );
  }

  if (equipment) {
    await ensureComment(
      equipment.id,
      actor.id,
      [
        "**Equipo**",
        `- Estaciones usadas ≈ ${stationCount} (timers + displays).`,
        "- Inventario local vacío: no se creó solicitud formal (la competencia ya terminó).",
        "- En producción, el delegado confirma SKUs desde el panel de equipo.",
      ].join("\n"),
    );
  }

  if (results) {
    await ensureComment(
      results.id,
      actor.id,
      [
        "**Resultados**",
        `- Scoretaking: WCA Live / captura durante el evento.`,
        wca.results_posted_at
          ? `- Publicados en WCA: ${wca.results_posted_at}`
          : "- Pendiente de publicación en WCA.",
        `- Enlace: ${wca.url}`,
      ].join("\n"),
    );
  }

  if (organizerDuties) {
    await ensureComment(
      organizerDuties.id,
      actor.id,
      "**Responsabilidades:** todos los organizadores listados en WCA aceptaron el formulario AMS (demo local).",
    );
  }

  if (groups) {
    await ensureComment(
      groups.id,
      actor.id,
      "**Groupifier:** grupos generados desde el WCIF; papeletas impresas el día previo. Sala única: Auditorio Principal.",
    );
  }

  if (emailPrep) {
    await ensureComment(
      emailPrep.id,
      actor.id,
      [
        "**Correo informativo**",
        `- Sede: ${venueName}`,
        `- Dirección: ${venueAddress}`,
        `- Fechas: ${wca.start_date} → ${wca.end_date}`,
        "- Incluye tutorial, registro y reglas de filmación del anuncio WCA.",
      ].join("\n"),
    );
  }

  if (finalEmail) {
    await ensureComment(
      finalEmail.id,
      actor.id,
      "**Correo final + encuesta:** enviados post-evento con enlace a resultados WCA y encuesta de calidad AMS (demo).",
    );
  }

  if (firstCosts) {
    await ensureComment(
      firstCosts.id,
      actor.id,
      "**Primer avance de costos:** entregado al delegado antes del anuncio (demo local).",
    );
  }

  if (finalCosts) {
    await ensureComment(
      finalCosts.id,
      actor.id,
      "**Informe final de costos:** cerrado tras publicar resultados (demo local).",
    );
  }

  if (sponsors) {
    await ensureComment(
      sponsors.id,
      actor.id,
      "**Patrocinios:** apoyo municipal de sede + Team EdoMex; sin patrocinio comercial mayor (demo).",
    );
  }

  // Move workflow cards: Hecho first, then Aprobado for key review cards
  console.log("→ Moving cards to Hecho / Aprobado");
  const toHechoTitles = [
    "Responsabilidades del Organizador",
    "Detalles de competencia",
    "Permiso de sede",
    "Categorías",
    "Horario",
    "Mapeo de sede",
    "Planeación de Staff",
    "Excel de Costos",
    "Sitio web (WCA)",
    "Publicación redes Torneo de Rubik",
    "Diseños",
    "Realizar inscripción",
    "Patrocinios y convenios",
    "Organización/Capacitación de staff",
    "Organiza grupos, imprime papeletas",
    "Preparación registro y Correo Informativo",
    "Entregar del primer avance de Costos",
    "Confirmación de equipo de competencia",
    "Correo Final y Encuesta de Calidad",
    "Entregar informe de costos final",
    "Captura de Resultados",
  ];

  let pos = 0;
  for (const title of toHechoTitles) {
    const card = await byTitle(title);
    if (!card) continue;
    await moveCardToList(card.id, hecho.id, pos);
    pos += 1;
  }

  const toAprobadoTitles = [
    "Permiso de sede",
    "Detalles de competencia",
    "Categorías",
    "Horario",
    "Sitio web (WCA)",
    "Publicación redes Torneo de Rubik",
    "Planeación de Staff",
    "Captura de Resultados",
  ];
  pos = 0;
  for (const title of toAprobadoTitles) {
    const card = await byTitle(title);
    if (!card) continue;
    await moveCardToList(card.id, aprobado.id, pos);
    pos += 1;
  }

  const [staffCount] = await db.execute<{ n: number }>(
    sql`select count(*)::int as n from competition_staff_member where competition_id = ${competition.id}`,
  );
  const commentCount = await db.execute<{ n: number }>(
    sql`select count(*)::int as n from card_comment c
        join card on card.id = c.card_id
        join board_list l on l.id = card.list_id
        where l.board_id = ${board.id}`,
  );
  const attachmentCount = await db.execute<{ n: number }>(
    sql`select count(*)::int as n from card_attachment a
        join card on card.id = a.card_id
        join board_list l on l.id = card.list_id
        where l.board_id = ${board.id}`,
  );
  const listCounts = await db.execute<{ title: string; n: number }>(
    sql`select l.title, count(c.id)::int as n
        from board_list l
        left join card c on c.list_id = l.id
        where l.board_id = ${board.id}
        group by l.id, l.title
        order by l.position`,
  );

  console.log(
    JSON.stringify(
      {
        competitionId: competition.id,
        boardId: board.id,
        staff: staffCount?.n ?? staffAdded,
        comments: commentCount[0]?.n,
        attachments: attachmentCount[0]?.n,
        lists: listCounts,
        organizers: organizerUserIds.length,
        stations: stationCount,
        events: eventsPlan.length,
      },
      null,
      2,
    ),
  );
  console.log("✅ Chiconcuac board populated");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
