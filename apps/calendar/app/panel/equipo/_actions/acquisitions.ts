"use server";

import { z } from "zod";
import {
  registerAcquisition,
  type AcquisitionLineInput,
} from "@workspace/db/equipment";
import { runAction, type ActionResult } from "@workspace/server/action";
import { log } from "@workspace/server/log";

import {
  formDate,
  formJson,
  formText,
  inEquipmentTx,
  requireEquipmentActor,
} from "../_lib/action-helpers";

const lineSchema = z.union([
  z.object({
    typeId: z.number().int().positive(),
    itemIds: z.array(z.number().int().positive()).min(1).max(500),
  }),
  z.object({
    typeId: z.number().int().positive(),
    quantity: z.number().int().positive().max(1000),
    guardianUserId: z.string().min(1),
  }),
]);

function skuSummary(skus: string[]) {
  if (skus.length === 0) return "";
  if (skus.length <= 3) return `: ${skus.join(", ")}`;
  return `: ${skus[0]} … ${skus.at(-1)}`;
}

export async function registerAcquisitionAction(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireEquipmentActor();
    const lines: AcquisitionLineInput[] = formJson(
      data,
      "lines",
      z.array(lineSchema).min(1, "Agrega al menos un renglón").max(50),
    );

    const result = await inEquipmentTx((tx) =>
      registerAcquisition(tx, {
        actorId: actor.id,
        date: formDate(data, "date"),
        description: formText(data, "description", 500),
        source: formText(data, "source", 120),
        kind: z
          .enum(["purchase", "donation", "sponsorship", "sale", "disposal"])
          .parse(data.get("kind")),
        lines,
      }),
    );

    log.info("calendar.equipment.acquisition_recorded", {
      acquisitionId: result.acquisitionId,
      createdSkus: result.createdSkus.length,
      actorId: actor.id,
    });
    return {
      ok: true,
      message: result.createdSkus.length
        ? `Registrado. ${result.createdSkus.length} SKU(s) generado(s)${skuSummary(result.createdSkus)}`
        : "Registrado",
    };
  }, "Revisa los renglones: cada uno necesita equipo, guardián y cantidad.");
}
