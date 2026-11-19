"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  cancelEquipmentRequest,
  EquipmentError,
} from "@workspace/db/equipment";
import {
  ActionError,
  runAction,
  type ActionResult,
} from "@workspace/server/action";
import { log } from "@workspace/server/log";

import { requireDelegate } from "@/lib/session";

export async function cancelEquipmentRequestAction(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const authResult = await requireDelegate();
    if (!authResult.ok) throw new ActionError(authResult.message);
    const actor = authResult.session.user;
    const requestId = z.coerce
      .number()
      .int()
      .positive()
      .parse(data.get("requestId"));

    try {
      await db.transaction((tx) =>
        cancelEquipmentRequest(tx, { actorId: actor.id, requestId }),
      );
      updateTag("equipment");
    } catch (error) {
      if (error instanceof EquipmentError) throw new ActionError(error.message);
      throw error;
    }

    log.info("calendar.equipment.request_cancelled", {
      requestId,
      actorId: actor.id,
    });
    return { ok: true, message: "Solicitud cancelada" };
  });
}
