import "server-only";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@workspace/db";
import { EQUIPMENT_CARD_TITLE } from "@workspace/db/data/ams-board-template";
import { EquipmentError, type EquipmentDb } from "@workspace/db/equipment";
import {
  competitionOrganizersOnly,
  equipmentConfirmedNotificationRow,
  equipmentNotificationRow,
  insertNotifications,
  notificationUsersByIds,
} from "@workspace/db/notifications";
import { boardLists, boards, cards, competitions } from "@workspace/db/schema";
import { ActionError } from "@workspace/server/action";

import { notificationAppUrls } from "@/lib/notification-urls";
import { requireDelegate } from "@/lib/session";
import { getCalendarUrl } from "@/lib/urls";

export async function requireEquipmentActor() {
  const result = await requireDelegate();
  if (!result.ok) throw new ActionError(result.message);
  return result.session.user;
}

/** Runs equipment mutations in one transaction; domain errors become toast messages. */
export async function inEquipmentTx<T>(
  run: (tx: EquipmentDb) => Promise<T>,
): Promise<T> {
  try {
    const result = await db.transaction((tx) => run(tx));
    updateTag("equipment");
    return result;
  } catch (error) {
    if (error instanceof EquipmentError) throw new ActionError(error.message);
    throw error;
  }
}

export async function notifyEquipment(
  tx: EquipmentDb,
  opts: {
    recipientIds: string[];
    actorId: string;
    type: "equipment_loaned" | "equipment_returned" | "equipment_transferred";
    equipmentLabel: string;
    loanId?: number;
    sku?: string;
  },
) {
  const recipients = await notificationUsersByIds(tx, opts.recipientIds);
  await insertNotifications(
    tx,
    [...recipients.values()].map((recipient) =>
      equipmentNotificationRow({
        recipient,
        actorId: opts.actorId,
        type: opts.type,
        calendarUrl: getCalendarUrl(),
        equipmentLabel: opts.equipmentLabel,
        loanId: opts.loanId,
        sku: opts.sku,
      }),
    ),
  );
}

/** Tells the organizers, linking to the equipment card of the competition board. */
export async function notifyEquipmentConfirmed(
  tx: EquipmentDb,
  opts: { actorId: string; competitionId: number; requestId: number },
) {
  const [organizers, [competition], [card]] = await Promise.all([
    competitionOrganizersOnly(tx, opts.competitionId),
    tx
      .select({ name: competitions.name, city: competitions.city })
      .from(competitions)
      .where(eq(competitions.id, opts.competitionId)),
    tx
      .select({ boardId: boards.id, cardId: cards.id })
      .from(boards)
      .innerJoin(boardLists, eq(boardLists.boardId, boards.id))
      .innerJoin(cards, eq(cards.listId, boardLists.id))
      .where(
        and(
          eq(boards.competitionId, opts.competitionId),
          eq(cards.title, EQUIPMENT_CARD_TITLE),
        ),
      )
      .limit(1),
  ]);
  await insertNotifications(
    tx,
    organizers.map((recipient) =>
      equipmentConfirmedNotificationRow({
        recipient,
        actorId: opts.actorId,
        urls: notificationAppUrls(),
        competitionId: opts.competitionId,
        requestId: opts.requestId,
        city: competition?.name?.trim() || competition?.city || "",
        boardId: card?.boardId,
        cardId: card?.cardId,
      }),
    ),
  );
}

export const formId = (data: FormData, field: string) =>
  z.coerce.number().int().positive().parse(data.get(field));

export const formText = (data: FormData, field: string, max = 500) =>
  z.string().trim().min(1).max(max).parse(data.get(field));

export const formOptionalText = (data: FormData, field: string, max = 2000) => {
  const value = data.get(field);
  if (value == null) return undefined;
  return z.string().trim().max(max).parse(value);
};

export const formDate = (data: FormData, field: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .parse(data.get(field));

export const formOptionalDate = (data: FormData, field: string) => {
  const value = String(data.get(field) ?? "").trim();
  return value
    ? z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .parse(value)
    : null;
};

export function formJson<T>(
  data: FormData,
  field: string,
  schema: z.ZodType<T>,
) {
  return schema.parse(JSON.parse(String(data.get(field) ?? "null")));
}
