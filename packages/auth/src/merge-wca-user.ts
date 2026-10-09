import { db } from "@workspace/db";
import {
  account,
  boardInvites,
  cardComments,
  courses,
  courseQuizAttempts,
  courseLegacyStudents,
  blogPosts,
  blogComments,
  logs,
  notifications,
  session,
  user,
  permissionAudit,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * A WCA account that signed in before having a WCA ID gets its own user row
 * (id = WCA numeric id, wcaId = null). If calendar later created a stub for
 * the new WCA ID (e.g. as organizer), the stub owns the wcaId foreign keys, so
 * the earlier row is folded into the stub and deleted before the stub is claimed.
 */
export async function mergeUserIntoStub(
  fromUserId: string,
  stubUserId: string,
) {
  if (fromUserId === stubUserId) return;

  await db.transaction(async (tx) => {
    await tx.execute(
      sql`update competition set requested_by_user_id = ${stubUserId} where requested_by_user_id = ${fromUserId}`,
    );
    await tx.execute(
      sql`update date_request set requested_by_user_id = ${stubUserId} where requested_by_user_id = ${fromUserId}`,
    );
    await tx.execute(sql`
      update competition_organizer co set organizer_user_id = ${stubUserId}
      where co.organizer_user_id = ${fromUserId} and not exists (
        select 1 from competition_organizer c2 where c2.competition_id = co.competition_id and c2.organizer_user_id = ${stubUserId}
      )
    `);
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
    // Preserve learning history and scoped LMS permissions when a WCA stub is
    // claimed. Conflicts merge completed work rather than losing it to cascade.
    await tx.execute(sql`
      insert into course_enrollment (course_id, user_id, enrolled_at, completed_at, source)
      select course_id, ${stubUserId}, enrolled_at, completed_at, source
      from course_enrollment where user_id = ${fromUserId}
      on conflict (course_id, user_id) do update set
        enrolled_at = least(course_enrollment.enrolled_at, excluded.enrolled_at),
        completed_at = coalesce(course_enrollment.completed_at, excluded.completed_at)
    `);
    await tx.execute(sql`
      insert into course_progress (lesson_id, user_id, completed_at, score)
      select lesson_id, ${stubUserId}, completed_at, score from course_progress
      where user_id = ${fromUserId}
      on conflict (lesson_id, user_id) do update set
        completed_at = least(course_progress.completed_at, excluded.completed_at),
        score = greatest(course_progress.score, excluded.score)
    `);
    await tx.execute(sql`
      insert into course_staff (user_id, role)
      select ${stubUserId}, role from course_staff where user_id = ${fromUserId}
      on conflict (user_id) do nothing
    `);
    await tx
      .update(courses)
      .set({ createdBy: stubUserId })
      .where(eq(courses.createdBy, fromUserId));
    await tx
      .update(courseQuizAttempts)
      .set({ userId: stubUserId })
      .where(eq(courseQuizAttempts.userId, fromUserId));
    await tx
      .update(courseLegacyStudents)
      .set({ claimedBy: stubUserId })
      .where(eq(courseLegacyStudents.claimedBy, fromUserId));
    await tx.execute(sql`
      insert into blog_staff (user_id, role)
      select ${stubUserId}, role from blog_staff where user_id = ${fromUserId}
      on conflict (user_id) do nothing
    `);
    await tx
      .update(blogPosts)
      .set({ authorId: stubUserId })
      .where(eq(blogPosts.authorId, fromUserId));
    await tx
      .update(blogComments)
      .set({ authorId: stubUserId })
      .where(eq(blogComments.authorId, fromUserId));
    await tx.execute(sql`
      insert into user_profile (user_id, city, biography, updated_at)
      select ${stubUserId}, city, biography, updated_at from user_profile where user_id = ${fromUserId}
      on conflict (user_id) do update set
        city = coalesce(nullif(user_profile.city, ''), excluded.city),
        biography = coalesce(nullif(user_profile.biography, ''), excluded.biography)
    `);
    await tx
      .update(permissionAudit)
      .set({ actorId: stubUserId })
      .where(eq(permissionAudit.actorId, fromUserId));
    await tx
      .update(permissionAudit)
      .set({ targetId: stubUserId })
      .where(eq(permissionAudit.targetId, fromUserId));
    await tx.delete(user).where(eq(user.id, fromUserId));
  });
}
