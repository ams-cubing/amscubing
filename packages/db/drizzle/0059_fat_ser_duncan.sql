ALTER TABLE "competition" ADD COLUMN "informative_email_subject" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "informative_email_body" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "informative_email_update_note" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "informative_email_check_in" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "informative_email_tutorial_time" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "informative_email_schedule_url" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "informative_email_address" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "informative_email_maps_url" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "informative_email_parking" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "informative_email_unofficial_events" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "informative_email_groups_url" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "informative_email_thanks" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "informative_email_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "informative_email_sent_by_user_id" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "informative_email_recipient_count" integer;--> statement-breakpoint
ALTER TABLE "competition" ADD CONSTRAINT "competition_informative_email_sent_by_user_id_user_id_fk" FOREIGN KEY ("informative_email_sent_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;