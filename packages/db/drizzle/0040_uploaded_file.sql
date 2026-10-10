CREATE TYPE "public"."uploaded_file_app" AS ENUM('blog', 'boards');--> statement-breakpoint
CREATE TABLE "uploaded_file" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"app" "uploaded_file_app" NOT NULL,
	"route" text NOT NULL,
	"uploader_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uploaded_file_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "uploaded_file" ADD CONSTRAINT "uploaded_file_uploader_user_id_user_id_fk" FOREIGN KEY ("uploader_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "uploaded_file_app_idx" ON "uploaded_file" USING btree ("app");--> statement-breakpoint
CREATE INDEX "uploaded_file_uploader_idx" ON "uploaded_file" USING btree ("uploader_user_id");