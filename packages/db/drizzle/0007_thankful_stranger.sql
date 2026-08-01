CREATE TYPE "public"."ultimatum_status" AS ENUM('active', 'expired', 'resolved');--> statement-breakpoint
CREATE TABLE "ultimatum" (
	"id" serial PRIMARY KEY NOT NULL,
	"competition_id" serial NOT NULL,
	"organizer_wca_id" text NOT NULL,
	"sent_by" text,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"deadline" date NOT NULL,
	"status" "ultimatum_status" DEFAULT 'active' NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "ultimatum" ADD CONSTRAINT "ultimatum_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ultimatum" ADD CONSTRAINT "ultimatum_organizer_wca_id_user_wca_id_fk" FOREIGN KEY ("organizer_wca_id") REFERENCES "public"."user"("wca_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ultimatum" ADD CONSTRAINT "ultimatum_sent_by_user_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ultimatum_competition_idx" ON "ultimatum" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "ultimatum_organizer_idx" ON "ultimatum" USING btree ("organizer_wca_id");