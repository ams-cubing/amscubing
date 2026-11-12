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

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function scoreCourse(tx: Tx, courseId: number, userId: string) {
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
  return calculateCourseScore(lessons, progress);
}

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
    const [learner] = await tx.select().from(user).where(eq(user.id, userId));
    const saved = enrollment.certificate;
    if (saved) {
      // Learners can link WCA or grade imported exams after finishing; the
      // rest of the certificate stays frozen.
      const wcaId = saved.wcaId ?? learner?.wcaId ?? null;
      const score =
        saved.scoreStatus === "unavailable"
          ? await scoreCourse(tx, courseId, userId)
          : null;
      const rescored = score?.scoreStatus === "scored";
      if (wcaId === saved.wcaId && !rescored) return saved;
      const certificate = { ...saved, wcaId, ...(rescored ? score : {}) };
      await tx
        .update(courseEnrollments)
        .set({ certificate })
        .where(eq(courseEnrollments.id, enrollment.id));
      return certificate;
    }
    const [course] = await tx
      .select()
      .from(courses)
      .where(eq(courses.id, courseId));
    if (!course || !learner) return null;
    const certificate = {
      folio: `AMS-${randomUUID()}`,
      name: learner.name,
      wcaId: learner.wcaId,
      courseTitle: course.title,
      completedAt: enrollment.completedAt.toISOString(),
      issuedAt: new Date().toISOString(),
      ...(await scoreCourse(tx, courseId, userId)),
    };
    await tx
      .update(courseEnrollments)
      .set({ certificate })
      .where(eq(courseEnrollments.id, enrollment.id));
    return certificate;
  });
}
