ALTER TABLE "competition" ALTER COLUMN "status_internal" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "competition" ALTER COLUMN "status_internal" SET DEFAULT 'looking_for_venue'::text;--> statement-breakpoint
DROP TYPE "public"."internal_status";--> statement-breakpoint
CREATE TYPE "public"."internal_status" AS ENUM('asked_for_help', 'looking_for_venue', 'venue_found', 'wca_approved', 'registration_open', 'celebrated', 'cancelled');--> statement-breakpoint
ALTER TABLE "competition" ALTER COLUMN "status_internal" SET DEFAULT 'looking_for_venue'::"public"."internal_status";--> statement-breakpoint
ALTER TABLE "competition" ALTER COLUMN "status_internal" SET DATA TYPE "public"."internal_status" USING "status_internal"::"public"."internal_status";