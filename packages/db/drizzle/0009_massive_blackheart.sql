CREATE TYPE "public"."log_action" AS ENUM('create_competition', 'update_competition', 'submit_availability');--> statement-breakpoint
CREATE TYPE "public"."log_target_type" AS ENUM('competition', 'availability', 'user');--> statement-breakpoint
ALTER TABLE "log" ALTER COLUMN "action" SET DATA TYPE "public"."log_action" USING "action"::"public"."log_action";--> statement-breakpoint
ALTER TABLE "log" ALTER COLUMN "target_type" SET DATA TYPE "public"."log_target_type" USING "target_type"::"public"."log_target_type";