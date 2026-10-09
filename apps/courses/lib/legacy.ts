import { db } from "@workspace/db";
import {
  courseLegacyStudents,
  courseLegacyRecords,
  courseEnrollments,
  courseProgress,
  type User,
} from "@workspace/db/schema";
import { and, eq, or, isNull, sql } from "drizzle-orm";

export async function claimLegacyProgress(
  viewer: Pick<User, "id" | "email" | "emailVerified">,
) {
  if (!viewer.emailVerified) return;
  await db.transaction(async (tx) => {
    const [student] = await tx
      .select()
      .from(courseLegacyStudents)
      .where(eq(courseLegacyStudents.email, viewer.email.trim().toLowerCase()))
      .for("update");
    if (!student || (student.claimedBy && student.claimedBy !== viewer.id))
      return;
    await tx
      .update(courseLegacyStudents)
      .set({ claimedBy: viewer.id })
      .where(
        and(
          eq(courseLegacyStudents.id, student.id),
          or(
            isNull(courseLegacyStudents.claimedBy),
            eq(courseLegacyStudents.claimedBy, viewer.id),
          ),
        ),
      );
    const records = await tx
      .select()
      .from(courseLegacyRecords)
      .where(eq(courseLegacyRecords.studentId, student.id));
    for (const record of records) {
      if (record.lessonId === null) {
        await tx
          .insert(courseEnrollments)
          .values({
            courseId: record.courseId,
            userId: viewer.id,
            enrolledAt: record.startedAt ?? new Date(),
            completedAt: record.completedAt,
            source: "wordpress",
          })
          .onConflictDoUpdate({
            target: [courseEnrollments.courseId, courseEnrollments.userId],
            set: {
              completedAt: sql`coalesce(${courseEnrollments.completedAt}, excluded.completed_at)`,
            },
          });
      } else if (record.completedAt) {
        await tx
          .insert(courseProgress)
          .values({
            lessonId: record.lessonId,
            userId: viewer.id,
            completedAt: record.completedAt,
            score: record.score,
          })
          .onConflictDoNothing();
      }
    }
  });
}
