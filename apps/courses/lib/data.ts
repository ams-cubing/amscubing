import { db } from "@workspace/db";
import {
  courses,
  courseModules,
  courseLessons,
  courseEnrollments,
  courseProgress,
} from "@workspace/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { calculateCourseScore } from "./course-score";

export async function getCatalog() {
  "use cache";
  cacheLife("hours");
  cacheTag("courses");

  return db
    .select({
      course: courses,
      count: sql<number>`count(${courseLessons.id})::int`,
    })
    .from(courses)
    .leftJoin(courseLessons, eq(courseLessons.courseId, courses.id))
    .where(eq(courses.status, "published"))
    .groupBy(courses.id)
    .orderBy(asc(courses.id));
}

async function loadCourse(slug: string, manager: boolean) {
  const [course] = await db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.slug, slug),
        manager ? undefined : eq(courses.status, "published"),
      ),
    );
  if (!course) return null;
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

async function getPublishedCourse(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("courses");

  return loadCourse(slug, false);
}

export async function getCourse(slug: string, manager = false) {
  const course = manager
    ? await loadCourse(slug, true)
    : await getPublishedCourse(slug);
  if (!course) notFound();
  return course;
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
  const lessons = await db
    .select({ id: courseLessons.id, quiz: courseLessons.quiz })
    .from(courseLessons)
    .where(eq(courseLessons.courseId, courseId));
  const result =
    enrollment?.certificate ?? calculateCourseScore(lessons, progress);
  return { enrollment, progress, result };
}
