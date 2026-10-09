import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  courses,
  courseEnrollments,
  courseLessons,
  courseProgress,
  user,
} from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { calculateCourseScore } from "./course-score";

/** Only the authenticated learner can issue their own certificate. */
export async function issueCertificate(courseId: number, userId: string) {
  return db.transaction(async (tx) => {
    const [enrollment] = await tx
      .select()
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.courseId, courseId),
          eq(courseEnrollments.userId, userId),
        ),
      )
      .for("update");
    if (!enrollment?.completedAt) return null;
    if (enrollment.certificate) return enrollment.certificate;
    const [course] = await tx
      .select()
      .from(courses)
      .where(eq(courses.id, courseId));
    const [learner] = await tx.select().from(user).where(eq(user.id, userId));
    if (!course || !learner) return null;
    const lessons = await tx
      .select()
      .from(courseLessons)
      .where(eq(courseLessons.courseId, courseId));
    const progress = await tx
      .select({
        lessonId: courseProgress.lessonId,
        score: courseProgress.score,
      })
      .from(courseProgress)
      .innerJoin(courseLessons, eq(courseProgress.lessonId, courseLessons.id))
      .where(
        and(
          eq(courseLessons.courseId, courseId),
          eq(courseProgress.userId, userId),
        ),
      );
    const certificate = {
      folio: `AMS-${randomUUID()}`,
      name: learner.name,
      wcaId: learner.wcaId,
      courseTitle: course.title,
      completedAt: enrollment.completedAt.toISOString(),
      issuedAt: new Date().toISOString(),
      ...calculateCourseScore(lessons, progress),
    };
    await tx
      .update(courseEnrollments)
      .set({ certificate })
      .where(eq(courseEnrollments.id, enrollment.id));
    return certificate;
  });
}
