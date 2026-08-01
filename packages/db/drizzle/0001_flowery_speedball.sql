ALTER TABLE "unavailability" RENAME COLUMN "start_date" TO "date";--> statement-breakpoint
ALTER TABLE "unavailability" DROP COLUMN "end_date";--> statement-breakpoint
ALTER TABLE "unavailability" DROP COLUMN "note";