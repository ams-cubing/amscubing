"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import {
  ActionError,
  runAction,
  type ActionResult,
} from "@workspace/server/action";
import { syncCompetitionFromWca } from "@workspace/social";

import { requireDelegate } from "@/lib/session";

const schema = z.object({
  competitionId: z.coerce.number().int().positive(),
});

/** Overwrite local announced competition fields from the public WCA API. */
export async function syncCompetitionFromWcaAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const auth = await requireDelegate();
    if (!auth.ok) throw new ActionError(auth.message);

    const input = schema.parse({
      competitionId: formData.get("competitionId"),
    });

    const result = await syncCompetitionFromWca({
      competitionId: input.competitionId,
      actorId: auth.session.user.id,
      requireAnnounced: true,
    });

    if (!result.ok) throw new ActionError(result.message);

    updateTag(`competition-${input.competitionId}`);
    updateTag("competitions");
    revalidatePath(`/panel/competencias/${input.competitionId}`);
    revalidatePath("/panel/competencias");
    revalidatePath("/panel");
    revalidatePath("/");

    return { ok: true, message: result.message };
  });
}
