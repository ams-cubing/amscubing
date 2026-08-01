CREATE TABLE "log" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unavailability" RENAME TO "availability";--> statement-breakpoint
ALTER TABLE "availability" DROP CONSTRAINT "unavailability_user_wca_id_user_wca_id_fk";
--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "wca_competition_url" text;--> statement-breakpoint
ALTER TABLE "log" ADD CONSTRAINT "log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "log_target_idx" ON "log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "log_actor_idx" ON "log" USING btree ("actor_id");--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_user_wca_id_user_wca_id_fk" FOREIGN KEY ("user_wca_id") REFERENCES "public"."user"("wca_id") ON DELETE cascade ON UPDATE no action;