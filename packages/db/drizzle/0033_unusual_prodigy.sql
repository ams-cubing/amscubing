CREATE TABLE "course_enrollment" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"source" text DEFAULT 'ams' NOT NULL,
	CONSTRAINT "course_enrollment_user_unique" UNIQUE("course_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "course_legacy_record" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"lesson_id" integer,
	"source_key" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"score" integer,
	CONSTRAINT "course_legacy_record_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
CREATE TABLE "course_legacy_student" (
	"id" serial PRIMARY KEY NOT NULL,
	"legacy_user_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"claimed_by" text,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "course_legacy_student_legacy_user_id_unique" UNIQUE("legacy_user_id"),
	CONSTRAINT "course_legacy_student_email_unique" UNIQUE("email"),
	CONSTRAINT "course_legacy_student_claimed_by_unique" UNIQUE("claimed_by")
);
--> statement-breakpoint
CREATE TABLE "course_lesson" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"module_id" integer,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"video_url" text,
	"position" integer DEFAULT 0 NOT NULL,
	"legacy_id" integer,
	"source_url" text,
	"quiz" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pass_percent" integer DEFAULT 80 NOT NULL,
	"requires_review" boolean DEFAULT false NOT NULL,
	CONSTRAINT "course_lesson_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "course_lesson_pass_check" CHECK ("course_lesson"."pass_percent" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "course_module" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"title" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"lesson_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"score" integer,
	CONSTRAINT "course_progress_user_unique" UNIQUE("lesson_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "course_quiz_attempt" (
	"id" serial PRIMARY KEY NOT NULL,
	"lesson_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"passed" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_staff" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "course_staff_role_check" CHECK ("course_staff"."role" in ('administrator', 'developer', 'instructor'))
);
--> statement-breakpoint
CREATE TABLE "course" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" text,
	"legacy_id" integer,
	"source_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "course_slug_unique" UNIQUE("slug"),
	CONSTRAINT "course_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "course_status_check" CHECK ("course"."status" in ('draft', 'published', 'archived'))
);
--> statement-breakpoint
ALTER TABLE "course_enrollment" ADD CONSTRAINT "course_enrollment_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollment" ADD CONSTRAINT "course_enrollment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_legacy_record" ADD CONSTRAINT "course_legacy_record_student_id_course_legacy_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."course_legacy_student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_legacy_record" ADD CONSTRAINT "course_legacy_record_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_legacy_record" ADD CONSTRAINT "course_legacy_record_lesson_id_course_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lesson"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_legacy_student" ADD CONSTRAINT "course_legacy_student_claimed_by_user_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_lesson" ADD CONSTRAINT "course_lesson_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_lesson" ADD CONSTRAINT "course_lesson_module_id_course_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."course_module"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_module" ADD CONSTRAINT "course_module_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_lesson_id_course_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lesson"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_quiz_attempt" ADD CONSTRAINT "course_quiz_attempt_lesson_id_course_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lesson"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_quiz_attempt" ADD CONSTRAINT "course_quiz_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_staff" ADD CONSTRAINT "course_staff_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_enrollment_user_idx" ON "course_enrollment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "course_legacy_record_student_idx" ON "course_legacy_record" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "course_lesson_course_idx" ON "course_lesson" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_module_course_idx" ON "course_module" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_progress_user_idx" ON "course_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "course_quiz_attempt_user_idx" ON "course_quiz_attempt" USING btree ("user_id");