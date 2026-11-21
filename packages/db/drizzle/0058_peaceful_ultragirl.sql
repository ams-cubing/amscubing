ALTER TABLE "competition" ADD COLUMN "final_email_subject" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "final_email_body" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "final_email_survey_url" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "final_email_certificates_url" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "final_email_photos_url" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "final_email_expense_url" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "final_email_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "final_email_sent_by_user_id" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "final_email_recipient_count" integer;--> statement-breakpoint
ALTER TABLE "competition" ADD CONSTRAINT "competition_final_email_sent_by_user_id_user_id_fk" FOREIGN KEY ("final_email_sent_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;