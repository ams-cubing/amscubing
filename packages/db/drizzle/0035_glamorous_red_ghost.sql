CREATE TABLE "blog_comment" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"author_id" text,
	"author_name" text NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"legacy_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_comment_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "blog_comment_status_check" CHECK ("blog_comment"."status" in ('pending','approved','hidden'))
);
--> statement-breakpoint
CREATE TABLE "blog_post" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"cover_url" text,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"comments_enabled" boolean DEFAULT true NOT NULL,
	"author_id" text,
	"author_name" text DEFAULT 'Equipo AMS' NOT NULL,
	"legacy_id" integer,
	"source_url" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_post_slug_unique" UNIQUE("slug"),
	CONSTRAINT "blog_post_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "blog_post_status_check" CHECK ("blog_post"."status" in ('draft','published','archived'))
);
--> statement-breakpoint
CREATE TABLE "blog_rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"resets_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_staff" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_staff_role_check" CHECK ("blog_staff"."role" in ('administrator','developer','editor'))
);
--> statement-breakpoint
ALTER TABLE "blog_comment" ADD CONSTRAINT "blog_comment_post_id_blog_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_comment" ADD CONSTRAINT "blog_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post" ADD CONSTRAINT "blog_post_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_staff" ADD CONSTRAINT "blog_staff_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blog_comment_post_idx" ON "blog_comment" USING btree ("post_id","status");--> statement-breakpoint
CREATE INDEX "blog_post_public_idx" ON "blog_post" USING btree ("status","published_at");