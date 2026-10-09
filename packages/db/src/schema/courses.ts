import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export type CourseQuestion = {
  id: string;
  prompt: string;
  type: "choice" | "boolean" | "text";
  options: string[];
  answers: string[];
  points: number;
};

export const courseStaff = pgTable(
  "course_staff",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: ["administrator", "developer", "instructor"],
    }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    check(
      "course_staff_role_check",
      sql`${t.role} in ('administrator', 'developer', 'instructor')`,
    ),
  ],
);

export const courses = pgTable(
  "course",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    coverUrl: text("cover_url"),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    legacyId: integer("legacy_id").unique(),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    check(
      "course_status_check",
      sql`${t.status} in ('draft', 'published', 'archived')`,
    ),
  ],
);

export const courseModules = pgTable(
  "course_module",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("course_module_course_idx").on(t.courseId)],
);

export const courseLessons = pgTable(
  "course_lesson",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    moduleId: integer("module_id").references(() => courseModules.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    videoUrl: text("video_url"),
    position: integer("position").notNull().default(0),
    legacyId: integer("legacy_id").unique(),
    sourceUrl: text("source_url"),
    quiz: jsonb("quiz").$type<CourseQuestion[]>().notNull().default([]),
    passPercent: integer("pass_percent").notNull().default(80),
    quizQuestionCount: integer("quiz_question_count").notNull().default(0),
    requiresReview: boolean("requires_review").notNull().default(false),
  },
  (t) => [
    index("course_lesson_course_idx").on(t.courseId),
    check("course_lesson_pass_check", sql`${t.passPercent} between 0 and 100`),
  ],
);

export const courseEnrollments = pgTable(
  "course_enrollment",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    source: text("source").notNull().default("ams"),
    certificate: jsonb("certificate").$type<CourseCertificate>(),
  },
  (t) => [
    unique("course_enrollment_user_unique").on(t.courseId, t.userId),
    index("course_enrollment_user_idx").on(t.userId),
  ],
);

export type CourseCertificate = {
  folio: string;
  name: string;
  wcaId: string | null;
  courseTitle: string;
  completedAt: string;
  issuedAt: string;
  score: number | null;
  scoreStatus: "scored" | "unavailable" | "ungraded";
};

export const courseProgress = pgTable(
  "course_progress",
  {
    id: serial("id").primaryKey(),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => courseLessons.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at").defaultNow().notNull(),
    score: integer("score"),
  },
  (t) => [
    unique("course_progress_user_unique").on(t.lessonId, t.userId),
    index("course_progress_user_idx").on(t.userId),
  ],
);

export const courseQuizAttempts = pgTable(
  "course_quiz_attempt",
  {
    id: serial("id").primaryKey(),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => courseLessons.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<Record<string, string[]>>().notNull(),
    score: integer("score").notNull(),
    passed: boolean("passed").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("course_quiz_attempt_user_idx").on(t.userId)],
);

// Imported identities never grant AMS permissions. Claim only after a verified
// WCA session matches the email; WordPress passwords are never imported.
export const courseLegacyStudents = pgTable("course_legacy_student", {
  id: serial("id").primaryKey(),
  legacyUserId: text("legacy_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  claimedBy: text("claimed_by")
    .unique()
    .references(() => user.id, { onDelete: "set null" }),
  importedAt: timestamp("imported_at").defaultNow().notNull(),
});

export const courseLegacyRecords = pgTable(
  "course_legacy_record",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => courseLegacyStudents.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id").references(() => courseLessons.id, {
      onDelete: "cascade",
    }),
    sourceKey: text("source_key").notNull().unique(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    score: integer("score"),
    certificateUrl: text("certificate_url"),
  },
  (t) => [index("course_legacy_record_student_idx").on(t.studentId)],
);
