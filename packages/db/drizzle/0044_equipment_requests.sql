CREATE TYPE "public"."equipment_request_status" AS ENUM('draft', 'submitted', 'fulfilled', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'equipment_requested';--> statement-breakpoint
ALTER TYPE "public"."equipment_event_action" ADD VALUE 'request_updated';--> statement-breakpoint
ALTER TYPE "public"."equipment_event_action" ADD VALUE 'request_submitted';--> statement-breakpoint
ALTER TYPE "public"."equipment_event_action" ADD VALUE 'request_cancelled';--> statement-breakpoint
CREATE TABLE "equipment_request_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"type_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "equipment_request_line_request_type_unique" UNIQUE("request_id","type_id")
);
--> statement-breakpoint
CREATE TABLE "equipment_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"competition_id" integer NOT NULL,
	"status" "equipment_request_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"requested_by_user_id" text,
	"submitted_at" timestamp,
	"fulfilled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_request_competition_id_unique" UNIQUE("competition_id")
);
--> statement-breakpoint
ALTER TABLE "equipment_loan" ADD COLUMN "request_id" integer;--> statement-breakpoint
ALTER TABLE "equipment_request_line" ADD CONSTRAINT "equipment_request_line_request_id_equipment_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."equipment_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_request_line" ADD CONSTRAINT "equipment_request_line_type_id_equipment_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."equipment_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_request" ADD CONSTRAINT "equipment_request_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_request" ADD CONSTRAINT "equipment_request_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_loan" ADD CONSTRAINT "equipment_loan_request_id_equipment_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."equipment_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "equipment_loan_competition_idx" ON "equipment_loan" USING btree ("competition_id");