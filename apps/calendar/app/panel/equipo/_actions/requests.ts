"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cancelEquipmentRequest,
  confirmEquipmentRequest,
} from "@workspace/db/equipment";
import { runAction, type ActionResult } from "@workspace/server/action";
import { log } from "@workspace/server/log";

import {
  formId,
  formJson,
  inEquipmentTx,
  notifyEquipmentConfirmed,
  requireEquipmentActor,
} from "../_lib/action-helpers";

export async function cancelEquipmentRequestAction(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireEquipmentActor();
    const requestId = formId(data, "requestId");
    await inEquipmentTx((tx) =>
      cancelEquipmentRequest(tx, { actorId: actor.id, requestId }),
    );
    log.info("calendar.equipment.request_cancelled", {
      requestId,
      actorId: actor.id,
    });
    return { ok: true, message: "Solicitud cancelada" };
  });
}

const guardianLine = z.object({
  typeId: z.number().int().positive(),
  quantity: z.number().int().min(0).max(1000),
  guardianUserId: z.string().min(1),
});

const confirmationLinesSchema = z.object({
  itemIds: z.array(z.number().int().positive()).max(500),
  autoPick: z.array(guardianLine).max(200),
  bulk: z.array(guardianLine).max(200),
});

export async function confirmEquipmentRequestAction(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireEquipmentActor();
    const requestId = formId(data, "requestId");
    const lines = formJson(data, "lines", confirmationLinesSchema);

    const result = await inEquipmentTx(async (tx) => {
      const confirmed = await confirmEquipmentRequest(tx, {
        actorId: actor.id,
        requestId,
        ...lines,
      });
      await notifyEquipmentConfirmed(tx, {
        actorId: actor.id,
        competitionId: confirmed.competitionId,
        requestId,
      });
      return confirmed;
    });

    log.info("calendar.equipment.request_confirmed", {
      requestId,
      competitionId: result.competitionId,
      actorId: actor.id,
    });
    redirect(
      `/panel/competencias/${result.competitionId}?guardado=equipo` as Route,
    );
  }, "Revisa el equipo que vas a confirmar.");
}
