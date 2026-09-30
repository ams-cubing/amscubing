ALTER TABLE "competition_organizer" DROP CONSTRAINT "competition_organizer_organizer_wca_id_user_wca_id_fk";
--> statement-breakpoint
ALTER TABLE "competition" DROP CONSTRAINT "competition_requested_by_user_wca_id_fk";
--> statement-breakpoint
ALTER TABLE "date_request" DROP CONSTRAINT "date_request_requested_by_user_wca_id_fk";
--> statement-breakpoint
ALTER TABLE "competition_organizer" ALTER COLUMN "organizer_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "date_request" ALTER COLUMN "requested_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "competition_organizer" DROP COLUMN "organizer_wca_id";--> statement-breakpoint
ALTER TABLE "competition" DROP COLUMN "requested_by";--> statement-breakpoint
ALTER TABLE "date_request" DROP COLUMN "requested_by";