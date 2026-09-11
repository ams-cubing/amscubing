import { db } from "@workspace/db";
import { user } from "@workspace/db/schema";
import { and, eq, ne } from "drizzle-orm";

import type { AmsRole } from "./wca-role";

export type ClaimableUser = {
  id: string;
  email: string;
  wcaId: string;
  role: string;
  regionId: string | null;
  delegateTitle: string | null;
  delegateLocation: string | null;
  name: string;
  image: string | null;
};

export type ClaimWcaStubProfile = {
  email: string;
  name: string;
  image?: string | null;
  role: AmsRole;
  regionId?: string | null;
  delegateTitle?: string | null;
  delegateLocation?: string | null;
};

export class WcaEmailCollisionError extends Error {
  readonly code = "wca_email_collision" as const;

  constructor(
    readonly wcaId: string,
    readonly email: string,
  ) {
    super(
      `Cannot claim WCA user ${wcaId}: email ${email} already belongs to another account`,
    );
    this.name = "WcaEmailCollisionError";
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * When calendar creates organizer stubs with `@ams.placeholder` emails, the first
 * WCA OAuth login must update that row to the real email so Better Auth can find
 * the user by email and link the account instead of inserting a duplicate wcaId.
 */
export async function claimWcaStubUser(
  existing: ClaimableUser,
  profile: ClaimWcaStubProfile,
): Promise<ClaimableUser> {
  const nextEmail = normalizeEmail(profile.email);
  const currentEmail = normalizeEmail(existing.email);

  if (nextEmail !== currentEmail) {
    const conflict = await db.query.user.findFirst({
      where: and(eq(user.email, nextEmail), ne(user.id, existing.id)),
      columns: { id: true },
    });

    if (conflict) {
      throw new WcaEmailCollisionError(existing.wcaId, nextEmail);
    }
  }

  const regionId = profile.regionId ?? existing.regionId ?? null;
  const delegateTitle = profile.delegateTitle ?? existing.delegateTitle ?? null;
  const delegateLocation =
    profile.delegateLocation ?? existing.delegateLocation ?? null;
  const image =
    profile.image === undefined ? existing.image : (profile.image ?? null);
  const now = new Date();

  const [updated] = await db
    .update(user)
    .set({
      email: nextEmail,
      name: profile.name,
      image,
      emailVerified: true,
      role: profile.role,
      regionId,
      delegateTitle,
      delegateLocation,
      lastLogin: now,
      updatedAt: now,
    })
    .where(eq(user.id, existing.id))
    .returning({
      id: user.id,
      email: user.email,
      wcaId: user.wcaId,
      role: user.role,
      regionId: user.regionId,
      delegateTitle: user.delegateTitle,
      delegateLocation: user.delegateLocation,
      name: user.name,
      image: user.image,
    });

  if (!updated) {
    throw new Error(`Failed to claim WCA stub user ${existing.wcaId}`);
  }

  return updated;
}
