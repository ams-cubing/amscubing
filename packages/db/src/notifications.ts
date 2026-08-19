import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "./index";
import {
  competitionDelegates,
  competitionOrganizers,
  notifications,
  type NotificationPayload,
  type NotificationType,
  user,
} from "./schema";

export type AppUrls = {
  calendarUrl: string;
  boardsUrl: string;
};

export type NotificationUser = {
  id: string;
  role: "delegate" | "user";
  wcaId: string;
};

export type NewNotificationRow = {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  href: string;
  payload?: NotificationPayload | null;
};

type DbOrTx = Pick<typeof db, "insert" | "select" | "update" | "query">;

const PUBLIC_STATUS_LABELS: Record<string, string> = {
  open: "Fecha Abierta",
  reserved: "Fecha Reservada",
  confirmed: "Sede Confirmada",
  announced: "Anunciada",
  suspended: "Suspendida",
  unavailable: "No disponible",
};

const INTERNAL_STATUS_LABELS: Record<string, string> = {
  asked_for_help: "Solicitando ayuda",
  looking_for_venue: "Buscando sede",
  venue_found: "Sede encontrada",
  wca_approved: "Aprobado por la WCA",
  registration_open: "Registro abierto",
  celebrated: "Celebrado",
  cancelled: "Cancelado",
};

export function formatPublicStatusLabel(status: string) {
  return PUBLIC_STATUS_LABELS[status] ?? status;
}

export function formatInternalStatusLabel(status: string) {
  return INTERNAL_STATUS_LABELS[status] ?? status;
}

function competitionLabel(ctx: { city?: string }) {
  return ctx.city?.trim() || "una competencia";
}

export function formatNotificationTitle(
  type: NotificationType,
  ctx: {
    cardTitle?: string;
    boardName?: string;
    city?: string;
    actorName?: string;
    statusLabel?: string;
  },
) {
  const card = ctx.cardTitle?.trim() || "una tarjeta";
  const board = ctx.boardName?.trim() || "un tablero";
  const actor = ctx.actorName?.trim() || "Alguien";
  const city = competitionLabel(ctx);

  switch (type) {
    case "card_assigned":
      return `Te asignaron a «${card}»`;
    case "card_comment":
      return `Nuevo comentario en «${card}»`;
    case "board_member_joined":
      return `${actor} se unió a ${board}`;
    case "delegate_added":
      return `Te asignaron como delegado en ${city}`;
    case "delegate_removed":
      return `Te removieron como delegado de ${city}`;
    case "organizer_added":
      return `Te asignaron como organizador en ${city}`;
    case "organizer_removed":
      return `Te removieron como organizador de ${city}`;
    case "competition_status_changed":
      return `Estatus: ${ctx.statusLabel ?? "actualizado"} — ${city}`;
    case "date_requested":
      return `Nueva solicitud de fecha: ${city}`;
    case "ultimatum_sent":
      return `Ultimátum enviado para ${city}`;
  }
}

export function hrefForNotification(
  type: NotificationType,
  opts: {
    urls: AppUrls;
    recipientRole: "delegate" | "user";
    boardId?: number;
    cardId?: number;
    competitionId?: number;
  },
) {
  const calendar = opts.urls.calendarUrl.replace(/\/$/, "");
  const boards = opts.urls.boardsUrl.replace(/\/$/, "");

  if (
    type === "card_assigned" ||
    type === "card_comment" ||
    type === "board_member_joined"
  ) {
    const boardPath = `${boards}/boards/${opts.boardId}`;
    if (opts.cardId != null) {
      return `${boardPath}?card=${opts.cardId}`;
    }
    return boardPath;
  }

  if (opts.recipientRole === "delegate" && opts.competitionId != null) {
    return `${calendar}/panel/competencias/${opts.competitionId}`;
  }

  return `${calendar}/mis-competencias`;
}

export function competitionNotificationRow(opts: {
  recipient: NotificationUser;
  actorId: string;
  type: NotificationType;
  urls: AppUrls;
  competitionId: number;
  city: string;
  statusLabel?: string;
  statusPublic?: string;
  statusInternal?: string;
}): NewNotificationRow {
  return {
    recipientId: opts.recipient.id,
    actorId: opts.actorId,
    type: opts.type,
    title: formatNotificationTitle(opts.type, {
      city: opts.city,
      statusLabel: opts.statusLabel,
    }),
    href: hrefForNotification(opts.type, {
      urls: opts.urls,
      recipientRole: opts.recipient.role,
      competitionId: opts.competitionId,
    }),
    payload: {
      competitionId: opts.competitionId,
      city: opts.city,
      statusLabel: opts.statusLabel,
      statusPublic: opts.statusPublic,
      statusInternal: opts.statusInternal,
    },
  };
}

export async function insertNotifications(
  dbOrTx: DbOrTx,
  rows: NewNotificationRow[],
) {
  const seen = new Set<string>();
  const filtered: NewNotificationRow[] = [];

  for (const row of rows) {
    if (row.actorId && row.recipientId === row.actorId) continue;
    if (seen.has(row.recipientId)) continue;
    seen.add(row.recipientId);
    filtered.push(row);
  }

  if (filtered.length === 0) return;

  await dbOrTx.insert(notifications).values(filtered);
}

export async function userIdsByWcaIds(
  dbOrTx: DbOrTx,
  wcaIds: string[],
): Promise<Map<string, NotificationUser>> {
  const unique = [...new Set(wcaIds.filter(Boolean))];
  const map = new Map<string, NotificationUser>();
  if (unique.length === 0) return map;

  const rows = await dbOrTx
    .select({
      id: user.id,
      role: user.role,
      wcaId: user.wcaId,
    })
    .from(user)
    .where(inArray(user.wcaId, unique));

  for (const row of rows) {
    map.set(row.wcaId, {
      id: row.id,
      role: row.role,
      wcaId: row.wcaId,
    });
  }

  return map;
}

export async function competitionTeamUsers(
  dbOrTx: DbOrTx,
  competitionId: number,
): Promise<NotificationUser[]> {
  const delegates = await dbOrTx
    .select({
      id: user.id,
      role: user.role,
      wcaId: user.wcaId,
    })
    .from(competitionDelegates)
    .innerJoin(user, eq(user.wcaId, competitionDelegates.delegateWcaId))
    .where(eq(competitionDelegates.competitionId, competitionId));

  const organizers = await dbOrTx
    .select({
      id: user.id,
      role: user.role,
      wcaId: user.wcaId,
    })
    .from(competitionOrganizers)
    .innerJoin(user, eq(user.wcaId, competitionOrganizers.organizerWcaId))
    .where(eq(competitionOrganizers.competitionId, competitionId));

  const byId = new Map<string, NotificationUser>();
  for (const row of organizers) {
    byId.set(row.id, row);
  }
  for (const row of delegates) {
    byId.set(row.id, row);
  }
  return [...byId.values()];
}

export type InboxNotification = {
  id: number;
  title: string;
  href: string;
  readAt: string | null;
  createdAt: string;
  actorName: string | null;
  actorImage: string | null;
};

export async function listNotificationsForUser(
  userId: string,
  limit = 20,
): Promise<InboxNotification[]> {
  const rows = await db.query.notifications.findMany({
    where: eq(notifications.recipientId, userId),
    orderBy: desc(notifications.createdAt),
    limit,
    with: {
      actor: {
        columns: { name: true, image: true },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    href: row.href,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    actorName: row.actor?.name ?? null,
    actorImage: row.actor?.image ?? null,
  }));
}

export async function countUnreadNotifications(userId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, userId),
        isNull(notifications.readAt),
      ),
    );

  return row?.value ?? 0;
}

export async function markNotificationRead(userId: string, id: number) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.recipientId, userId),
        isNull(notifications.readAt),
      ),
    );
}

export async function markAllNotificationsRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientId, userId),
        isNull(notifications.readAt),
      ),
    );
}
