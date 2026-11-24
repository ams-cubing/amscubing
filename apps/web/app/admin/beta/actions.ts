"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { getBoardsUrl } from "@workspace/auth/urls";
import { db } from "@workspace/db";
import {
  BETA_FEATURES,
  betaFeatureLabel,
  isBetaFeatureKey,
  setBetaFeatureGrant,
  type BetaFeatureKey,
} from "@workspace/db/beta-features";
import {
  formatNotificationTitle,
  insertNotifications,
} from "@workspace/db/notifications";
import { user } from "@workspace/db/schema";
import {
  ActionError,
  runAction,
  type ActionResult,
} from "@workspace/server/action";
import { log } from "@workspace/server/log";

import { requireDelegate } from "@/lib/session";

const featureKeys = Object.keys(BETA_FEATURES) as [
  BetaFeatureKey,
  ...BetaFeatureKey[],
];

const schema = z.object({
  userId: z.string().min(1).optional(),
  email: z.string().email().optional(),
  featureKey: z.enum(featureKeys),
  enabled: z.enum(["1", "0"]),
});

export async function setBetaFeatureAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const auth = await requireDelegate();
    if (!auth.ok) throw new ActionError(auth.message);

    const parsed = schema.safeParse({
      userId: formData.get("userId") || undefined,
      email: formData.get("email") || undefined,
      featureKey: formData.get("featureKey"),
      enabled: formData.get("enabled"),
    });
    if (!parsed.success) {
      throw new ActionError("Datos de beta no válidos.");
    }
    const input = parsed.data;
    if (!isBetaFeatureKey(input.featureKey)) {
      throw new ActionError("Función beta no válida.");
    }

    let target =
      input.userId != null
        ? await db.query.user.findFirst({
            where: eq(user.id, input.userId),
            columns: {
              id: true,
              name: true,
              email: true,
              emailVerified: true,
            },
          })
        : null;

    if (!target && input.email) {
      const email = input.email.trim().toLowerCase();
      const [byEmail] = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
        })
        .from(user)
        .where(sql`lower(${user.email}) = ${email}`)
        .limit(1);
      target = byEmail ?? null;
    }

    if (!target || !target.emailVerified) {
      throw new ActionError(
        "La persona debe tener una cuenta AMS y verificar su correo primero.",
      );
    }
    if (target.id === auth.session.user.id) {
      throw new ActionError(
        "Otro delegado debe modificar tu propio acceso beta.",
      );
    }

    const enabled = input.enabled === "1";
    const { changed } = await setBetaFeatureGrant(db, {
      actorId: auth.session.user.id,
      targetUserId: target.id,
      featureKey: input.featureKey,
      enabled,
    });

    if (changed) {
      const label = betaFeatureLabel(input.featureKey);
      try {
        await insertNotifications(db, [
          {
            recipientId: target.id,
            actorId: auth.session.user.id,
            type: "beta_feature_changed",
            title: formatNotificationTitle("beta_feature_changed", {
              roleLabel: enabled ? label : undefined,
            }),
            href: getBoardsUrl(),
            payload: { role: enabled ? input.featureKey : "none" },
          },
        ]);
      } catch (error) {
        log.error("web.notification_failed", {
          event: "beta_feature_changed",
          error,
        });
      }
    }

    revalidatePath("/admin/beta");
    updateTag("beta-feature-grants");
    log.info("web.beta_feature_changed", {
      userId: target.id,
      featureKey: input.featureKey,
      enabled,
      actorId: auth.session.user.id,
      changed,
    });

    return {
      ok: true,
      message: changed
        ? enabled
          ? `${target.name} ya tiene «${betaFeatureLabel(input.featureKey)}».`
          : `Se quitó «${betaFeatureLabel(input.featureKey)}» a ${target.name}.`
        : enabled
          ? `${target.name} ya tenía ese acceso beta.`
          : `${target.name} no tenía ese acceso beta.`,
    };
  });
}
