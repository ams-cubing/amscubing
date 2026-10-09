import { db } from "@workspace/db";
import {
  courses,
  courseModules,
  courseLessons,
  courseEnrollments,
  courseProgress,
} from "@workspace/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export async function getCourse(slug: string, manager = false) {
  const [course] = await db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.slug, slug),
        manager ? undefined : eq(courses.status, "published"),
      ),
    );
  if (!course) notFound();
  const modules = await db
    .select()
    .from(courseModules)
    .where(eq(courseModules.courseId, course.id))
    .orderBy(asc(courseModules.position));
  const lessons = await db
    .select()
    .from(courseLessons)
    .where(eq(courseLessons.courseId, course.id))
    .orderBy(asc(courseLessons.position));
  return { ...course, modules, lessons };
}
export async function getProgress(courseId: number, userId: string) {
  const [enrollment] = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.courseId, courseId),
        eq(courseEnrollments.userId, userId),
      ),
    );
  const progress = await db
    .select({ lessonId: courseProgress.lessonId, score: courseProgress.score })
    .from(courseProgress)
    .innerJoin(courseLessons, eq(courseProgress.lessonId, courseLessons.id))
    .where(
      and(
        eq(courseProgress.userId, userId),
        eq(courseLessons.courseId, courseId),
      ),
    );
  return { enrollment, progress };
}
