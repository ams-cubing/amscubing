"use server";

import { z } from "zod";
import {
  adjustStock,
  createEquipmentType,
  setEquipmentTypeObsolete,
  setStockNotes,
  transferItems,
  transferStock,
  updateItem,
} from "@workspace/db/equipment";
import { runAction, type ActionResult } from "@workspace/server/action";
import { log } from "@workspace/server/log";

import {
  formId,
  formJson,
  formOptionalText,
  formText,
  inEquipmentTx,
  notifyEquipment,
  requireEquipmentActor,
} from "../_lib/action-helpers";

const statusSchema = z.enum([
  "functional",
  "faulty",
  "in_repair",
  "lost",
  "retired",
]);

export async function updateItemAction(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireEquipmentActor();
    const itemId = formId(data, "itemId");
    const result = await inEquipmentTx((tx) =>
      updateItem(tx, {
        actorId: actor.id,
        itemId,
        status: statusSchema.parse(data.get("status")),
        notes: formOptionalText(data, "notes") ?? null,
      }),
    );
    if (!result.changed) return { ok: true, message: "Sin cambios" };
    log.info("calendar.equipment.item_updated", { itemId, actorId: actor.id });
    return { ok: true, message: "Unidad actualizada" };
  });
}

export async function transferItemsAction(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireEquipmentActor();
    const itemIds = formJson(
      data,
      "itemIds",
      z.array(z.number().int().positive()).min(1).max(500),
    );
    const toUserId = formText(data, "toUserId");
    const note = formOptionalText(data, "note") || undefined;

    const moved = await inEquipmentTx(async (tx) => {
      const { moved } = await transferItems(tx, {
        actorId: actor.id,
        itemIds,
        toUserId,
        note,
      });
      if (moved.length) {
        await notifyEquipment(tx, {
          recipientIds: [toUserId],
          actorId: actor.id,
          type: "equipment_transferred",
          equipmentLabel: moved.map((item) => item.sku).join(", "),
          sku: moved.length === 1 ? moved[0]!.sku : undefined,
        });
      }
      return moved.length;
    });
    if (moved === 0)
      return { ok: true, message: "Ya estaban con ese guardián" };
    log.info("calendar.equipment.items_transferred", {
      count: moved,
      toUserId,
      actorId: actor.id,
    });
    return { ok: true, message: `${moved} unidad(es) transferida(s)` };
  });
}

export async function transferStockAction(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireEquipmentActor();
    const typeId = formId(data, "typeId");
    const fromUserId = formText(data, "fromUserId");
    const toUserId = formText(data, "toUserId");
    const quantity = formId(data, "quantity");
    const note = formOptionalText(data, "note") || undefined;

    await inEquipmentTx(async (tx) => {
      const { type } = await transferStock(tx, {
        actorId: actor.id,
        typeId,
        fromUserId,
        toUserId,
        quantity,
        note,
      });
      await notifyEquipment(tx, {
        recipientIds: [toUserId],
        actorId: actor.id,
        type: "equipment_transferred",
        equipmentLabel: `${quantity} ${type.name}`,
      });
    });
    log.info("calendar.equipment.stock_transferred", {
      typeId,
      quantity,
      fromUserId,
      toUserId,
      actorId: actor.id,
    });
    return { ok: true, message: "Cantidad transferida" };
  });
}

export async function adjustStockAction(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireEquipmentActor();
    const typeId = formId(data, "typeId");
    const guardianUserId = formText(data, "guardianUserId");
    const delta = z.coerce.number().int().parse(data.get("delta"));
    const reason = formText(data, "reason");

    await inEquipmentTx((tx) =>
      adjustStock(tx, {
        actorId: actor.id,
        typeId,
        guardianUserId,
        delta,
        reason,
      }),
    );
    log.info("calendar.equipment.stock_adjusted", {
      typeId,
      guardianUserId,
      delta,
      actorId: actor.id,
    });
    return { ok: true, message: "Cantidad ajustada" };
  });
}

export async function setStockNotesAction(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireEquipmentActor();
    await inEquipmentTx((tx) =>
      setStockNotes(tx, {
        actorId: actor.id,
        typeId: formId(data, "typeId"),
        guardianUserId: formText(data, "guardianUserId"),
        notes: formOptionalText(data, "notes") ?? "",
      }),
    );
    return { ok: true, message: "Notas guardadas" };
  });
}

export async function createTypeAction(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireEquipmentActor();
    const type = await inEquipmentTx((tx) =>
      createEquipmentType(tx, {
        actorId: actor.id,
        name: formText(data, "name", 120),
        skuPrefix: formText(data, "skuPrefix", 6),
        category: z
          .enum(["timer", "display", "accessory", "other"])
          .parse(data.get("category")),
        tracking: z.enum(["serialized", "bulk"]).parse(data.get("tracking")),
        sortOrder: z.coerce
          .number()
          .int()
          .min(0)
          .max(999)
          .parse(data.get("sortOrder") || 0),
      }),
    );
    log.info("calendar.equipment.type_created", {
      typeId: type.id,
      actorId: actor.id,
    });
    return {
      ok: true,
      message: `Tipo ${type.name} (${type.skuPrefix}) creado`,
    };
  });
}

export async function setTypeObsoleteAction(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireEquipmentActor();
    const typeId = formId(data, "typeId");
    const obsolete = data.get("obsolete") === "true";
    const type = await inEquipmentTx((tx) =>
      setEquipmentTypeObsolete(tx, { actorId: actor.id, typeId, obsolete }),
    );
    log.info("calendar.equipment.type_obsolete_changed", {
      typeId,
      obsolete,
      actorId: actor.id,
    });
    return {
      ok: true,
      message: obsolete
        ? `${type.name} marcado como obsoleto`
        : `${type.name} se puede volver a solicitar`,
    };
  });
}
