CREATE TYPE "public"."date_request_status" AS ENUM('open', 'accepted', 'exhausted');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'date_request_accepted' BEFORE 'ultimatum_sent';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'date_request_declined' BEFORE 'ultimatum_sent';--> statement-breakpoint
CREATE TABLE "date_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"city" text NOT NULL,
	"state_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"requested_by" text NOT NULL,
	"proposed_delegate_wca_id" text,
	"declined_delegate_wca_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" date_request_status DEFAULT 'open' NOT NULL,
	"competition_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "date_request" ADD CONSTRAINT "date_request_state_id_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_request" ADD CONSTRAINT "date_request_requested_by_user_wca_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("wca_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_request" ADD CONSTRAINT "date_request_proposed_delegate_wca_id_user_wca_id_fk" FOREIGN KEY ("proposed_delegate_wca_id") REFERENCES "public"."user"("wca_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_request" ADD CONSTRAINT "date_request_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE set null ON UPDATE no action;