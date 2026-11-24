"use server";

import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";

import { db } from "@workspace/db";
import { multiCompetitionOrganizers, user } from "@workspace/db/schema";
import {
  ActionError,
  runAction,
  type ActionResult,
} from "@workspace/server/action";
import { log } from "@workspace/server/log";

import { requireDelegate } from "@/lib/session";

const schema = z.object({
  userId: z.string().min(1),
  allow: z.enum(["1", "0"]),
});

/** Global allowlist: organizer may request dates while another competition is pending. */
export async function setMultiCompetitionOrganizerAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const auth = await requireDelegate();
    if (!auth.ok) throw new ActionError(auth.message);

    const input = schema.parse({
      userId: formData.get("userId"),
      allow: formData.get("allow"),
    });

    const organizer = await db.query.user.findFirst({
      where: eq(user.id, input.userId),
      columns: { id: true, name: true },
    });
    if (!organizer) throw new ActionError("Usuario no encontrado");

    if (input.allow === "1") {
      await db
        .insert(multiCompetitionOrganizers)
        .values({ userId: organizer.id, grantedByUserId: auth.session.user.id })
        .onConflictDoNothing();
    } else {
      await db
        .delete(multiCompetitionOrganizers)
        .where(eq(multiCompetitionOrganizers.userId, organizer.id));
    }

    updateTag("multi-competition-organizers");
    log.info("web.multi_competition_organizer_changed", {
      userId: organizer.id,
      allow: input.allow === "1",
      actorId: auth.session.user.id,
    });

    return {
      ok: true,
      message:
        input.allow === "1"
          ? `${organizer.name} ya puede organizar varias competencias a la vez`
          : `${organizer.name} vuelve a organizar una competencia a la vez`,
    };
  });
}
