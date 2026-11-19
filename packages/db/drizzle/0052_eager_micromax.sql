ALTER TABLE "competition" ADD COLUMN "station_count" integer;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "zone_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "events_plan" jsonb DEFAULT '[]'::jsonb NOT NULL;