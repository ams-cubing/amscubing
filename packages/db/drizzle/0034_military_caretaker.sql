ALTER TABLE "course_legacy_record" ADD COLUMN "certificate_url" text;--> statement-breakpoint
ALTER TABLE "course_lesson" ADD COLUMN "quiz_question_count" integer DEFAULT 0 NOT NULL;