import { db } from "@workspace/db";
import { account, user } from "@workspace/db/schema";
import { and, eq, isNull, ne } from "drizzle-orm";

import { WcaEmailCollisionError } from "./claim-wca-stub";
import { mergeUserIntoStub } from "./merge-wca-user";

function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findUserWithoutWcaIdByAccount(wcaAccountId: string) {
  const [row] = await db
    .select({ id: user.id })
    .from(account)
    .innerJoin(user, eq(user.id, account.userId))
    .where(
      and(
        eq(account.providerId, "wca"),
        eq(account.accountId, wcaAccountId),
        isNull(user.wcaId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Fold any earlier AMS row into the WCA stub before claiming its email.
 * Covers (1) WCA OAuth before a WCA ID existed and (2) email/password
 * signups that later collide when the organizer stub is claimed.
 */
export async function mergeEarlierUsersIntoWcaStub(options: {
  stubId: string;
  stubWcaId: string | null;
  wcaAccountId: string;
  email: string;
}) {
  const earlier = await findUserWithoutWcaIdByAccount(options.wcaAccountId);
  if (earlier && earlier.id !== options.stubId) {
    await mergeUserIntoStub(earlier.id, options.stubId);
  }

  const emailConflict = await db.query.user.findFirst({
    where: and(
      eq(user.email, normalizeAuthEmail(options.email)),
      ne(user.id, options.stubId),
    ),
    columns: {
      id: true,
      email: true,
      emailVerified: true,
      wcaId: true,
    },
  });

  if (!emailConflict) return;

  if (emailConflict.wcaId) {
    throw new WcaEmailCollisionError(
      options.stubWcaId,
      normalizeAuthEmail(options.email),
    );
  }

  if (
    !emailConflict.emailVerified &&
    !emailConflict.email.includes("@ams.placeholder")
  ) {
    throw new Error("Verifica tu correo AMS antes de vincular WCA");
  }

  await mergeUserIntoStub(emailConflict.id, options.stubId);
}

export function stubNeedsWcaEmailClaim(
  stubEmail: string,
  wcaEmail: string,
): boolean {
  const current = normalizeAuthEmail(stubEmail);
  const next = normalizeAuthEmail(wcaEmail);
  return current.includes("@ams.placeholder") || current !== next;
}
