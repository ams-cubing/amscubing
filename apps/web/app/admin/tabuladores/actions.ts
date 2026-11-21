"use server";

import { revalidatePath, updateTag } from "next/cache";

import { db } from "@workspace/db";
import {
  AmsCompetitionScaleError,
  serializeScaleTiers,
  type AmsCompetitionTierStored,
} from "@workspace/db/ams-competition-scale";
import {
  getCompetitionScaleTiers,
  saveCompetitionScaleTiers,
} from "@workspace/db/ams-competition-scale-store";
import { consumeRateLimit } from "@workspace/db/rate-limit";
import { ActionError, runAction, type ActionResult } from "@workspace/server/action";
import { log } from "@workspace/server/log";

import { requireDelegate } from "@/lib/session";

export type ScaleConfigView = {
  tiers: AmsCompetitionTierStored[];
  updatedAt: string | null;
  updatedByName: string | null;
};

export async function loadCompetitionScaleConfig(): Promise<ScaleConfigView> {
  const config = await getCompetitionScaleTiers(db);
  return {
    tiers: serializeScaleTiers(config.tiers),
    updatedAt: config.updatedAt?.toISOString() ?? null,
    updatedByName: config.updatedByName,
  };
}

export async function saveCompetitionScaleConfigAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const authResult = await requireDelegate();
    if (!authResult.ok) {
      throw new ActionError(authResult.message);
    }

    const { allowed } = await consumeRateLimit({
      key: `web:competition-scale:user:${authResult.session.user.id}`,
      windowMs: 60_000,
      max: 20,
    });
    if (!allowed) {
      throw new ActionError("Demasiados cambios. Espera un momento.");
    }

    const raw = String(formData.get("tiers") ?? "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ActionError("No se pudo leer el tabulador");
    }

    try {
      await saveCompetitionScaleTiers(
        db,
        parsed,
        authResult.session.user.id,
      );
    } catch (error) {
      if (error instanceof AmsCompetitionScaleError) {
        throw new ActionError(error.message);
      }
      throw error;
    }

    updateTag("ams-competition-scale");
    revalidatePath("/admin/tabuladores");
    revalidatePath("/tabuladores");

    log.info("competition_scale_saved", {
      userId: authResult.session.user.id,
    });

    return { ok: true, message: "Tabuladores guardados" };
  });
}
