"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createLoan, returnLoanLines } from "@workspace/db/equipment";
import { runAction, type ActionResult } from "@workspace/server/action";
import { log } from "@workspace/server/log";

import {
  formDate,
  formId,
  formJson,
  formOptionalDate,
  formOptionalText,
  formText,
  inEquipmentTx,
  notifyEquipment,
  requireEquipmentActor,
} from "../_lib/action-helpers";

const quantityLine = z.object({
  typeId: z.number().int().positive(),
  quantity: z.number().int().min(0).max(1000),
});

const loanLinesSchema = z.object({
  itemIds: z.array(z.number().int().positive()).max(500),
  autoPick: z.array(quantityLine).max(100),
  bulk: z.array(quantityLine).max(100),
});

export async function createLoanAction(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireEquipmentActor();
    const borrowerUserId = z
      .string()
      .min(1, "Selecciona a quién se presta")
      .parse(data.get("borrowerUserId"));
    const lentByUserId = formText(data, "lentByUserId");
    const competitionRaw = String(data.get("competitionId") ?? "");
    const requestRaw = String(data.get("requestId") ?? "");
    const lines = formJson(data, "lines", loanLinesSchema);

    const loanId = await inEquipmentTx(async (tx) => {
      const { loanId, summary } = await createLoan(tx, {
        actorId: actor.id,
        borrowerUserId,
        lentByUserId,
        competitionId: competitionRaw ? formId(data, "competitionId") : null,
        requestId: requestRaw ? formId(data, "requestId") : null,
        reason: formText(data, "reason", 500),
        loanedAt: formDate(data, "loanedAt"),
        dueAt: formOptionalDate(data, "dueAt"),
        notes: formOptionalText(data, "notes") || null,
        ...lines,
      });
      await notifyEquipment(tx, {
        recipientIds: [borrowerUserId],
        actorId: actor.id,
        type: "equipment_loaned",
        equipmentLabel: summary,
        loanId,
      });
      return loanId;
    });

    log.info("calendar.equipment.loan_created", {
      loanId,
      borrowerUserId,
      lentByUserId,
      requestId: requestRaw || null,
      actorId: actor.id,
    });
    redirect(`/panel/equipo/prestamos/${loanId}?guardado=prestamo` as Route);
  }, "Revisa el préstamo: falta quién recibe, la razón o las fechas.");
}

const returnSchema = z.object({
  items: z
    .array(
      z.object({
        lineId: z.number().int().positive(),
        status: z.enum(["functional", "faulty", "in_repair", "lost"]),
      }),
    )
    .max(500),
  bulk: z
    .array(
      z.object({
        lineId: z.number().int().positive(),
        returned: z.number().int().min(0),
        lost: z.number().int().min(0),
      }),
    )
    .max(100),
});

export async function returnLoanAction(
  _state: ActionResult | null,
  data: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireEquipmentActor();
    const loanId = formId(data, "loanId");
    const { items, bulk } = formJson(data, "returns", returnSchema);

    const closed = await inEquipmentTx(async (tx) => {
      const result = await returnLoanLines(tx, {
        actorId: actor.id,
        loanId,
        items,
        bulk,
      });
      await notifyEquipment(tx, {
        recipientIds: [result.borrowerUserId],
        actorId: actor.id,
        type: "equipment_returned",
        equipmentLabel: result.summary,
        loanId,
      });
      return result.closed;
    });

    log.info("calendar.equipment.loan_returned", {
      loanId,
      closed,
      actorId: actor.id,
    });
    return {
      ok: true,
      message: closed
        ? "Préstamo devuelto por completo"
        : "Devolución parcial registrada",
    };
  });
}
