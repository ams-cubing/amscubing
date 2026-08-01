ALTER TYPE "public"."log_action" ADD VALUE 'delete_competition' BEFORE 'submit_availability';--> statement-breakpoint
ALTER TYPE "public"."log_action" ADD VALUE 'send_ultimatum' BEFORE 'submit_availability';--> statement-breakpoint
ALTER TABLE "log" ALTER COLUMN "target_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."log_target_type";--> statement-breakpoint
CREATE TYPE "public"."log_target_type" AS ENUM('competition', 'availability');--> statement-breakpoint
ALTER TABLE "log" ALTER COLUMN "target_type" SET DATA TYPE "public"."log_target_type" USING "target_type"::"public"."log_target_type";