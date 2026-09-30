import { db } from "@workspace/db";
import {
  account,
  boardInvites,
  cardComments,
  logs,
  notifications,
  session,
  user,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * A WCA account that signed in before having a WCA ID gets its own user row
 * (id = WCA numeric id, wcaId = null). If calendar later created a stub for
 * the new WCA ID (e.g. as organizer), the stub owns the wcaId foreign keys, so
 * the earlier row is folded into the stub and deleted before the stub is claimed.
 */
export async function mergeUserIntoStub(fromUserId: string, stubUserId: string) {
  if (fromUserId === stubUserId) return;

  await db.transaction(async (tx) => {
    await tx
      .update(account)
      .set({ userId: stubUserId })
      .where(eq(account.userId, fromUserId));
    await tx
      .update(session)
      .set({ userId: stubUserId })
      .where(eq(session.userId, fromUserId));
    await tx
      .update(notifications)
      .set({ recipientId: stubUserId })
      .where(eq(notifications.recipientId, fromUserId));
    await tx
      .update(notifications)
      .set({ actorId: stubUserId })
      .where(eq(notifications.actorId, fromUserId));
    await tx
      .update(logs)
      .set({ actorId: stubUserId })
      .where(eq(logs.actorId, fromUserId));
    await tx
      .update(boardInvites)
      .set({ createdByUserId: stubUserId })
      .where(eq(boardInvites.createdByUserId, fromUserId));
    await tx
      .update(cardComments)
      .set({ authorId: stubUserId })
      .where(eq(cardComments.authorId, fromUserId));
    // Membership tables are unique per (parent, user); rows the stub already has
    // are left behind and removed by the cascade below.
    await tx.execute(sql`
      update board_member bm set user_id = ${stubUserId}
      where bm.user_id = ${fromUserId}
        and not exists (
          select 1 from board_member b2
          where b2.board_id = bm.board_id and b2.user_id = ${stubUserId}
        )
    `);
    await tx.execute(sql`
      update card_member cm set user_id = ${stubUserId}
      where cm.user_id = ${fromUserId}
        and not exists (
          select 1 from card_member c2
          where c2.card_id = cm.card_id and c2.user_id = ${stubUserId}
        )
    `);
    await tx.delete(user).where(eq(user.id, fromUserId));
  });
}
