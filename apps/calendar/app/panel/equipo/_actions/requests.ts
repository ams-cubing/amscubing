"use server";

import { cancelEquipmentRequest } from "@workspace/db/equipment";
import { runAction, type ActionResult } from "@workspace/server/action";
import { log } from "@workspace/server/log";

import {
  formId,
  inEquipmentTx,
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
