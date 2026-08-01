DROP TABLE "ultimatum" CASCADE;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "trello_assigned_at" timestamp;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "ultimatum_sent_at" timestamp;--> statement-breakpoint
DROP TYPE "public"."ultimatum_status";