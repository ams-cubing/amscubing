ALTER TYPE "public"."notification_type" ADD VALUE 'equipment_confirmed';--> statement-breakpoint
ALTER TYPE "public"."equipment_event_action" ADD VALUE 'request_confirmed';--> statement-breakpoint
CREATE TABLE "equipment_confirmation_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"type_id" integer NOT NULL,
	"item_id" integer,
	"guardian_user_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "equipment_confirmation_line_request_item_unique" UNIQUE("request_id","item_id")
);
--> statement-breakpoint
ALTER TABLE "equipment_loan" DROP CONSTRAINT "equipment_loan_request_id_equipment_request_id_fk";
--> statement-breakpoint
ALTER TABLE "equipment_request" ADD COLUMN "confirmed_by_user_id" text;--> statement-breakpoint
ALTER TABLE "equipment_confirmation_line" ADD CONSTRAINT "equipment_confirmation_line_request_id_equipment_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."equipment_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_confirmation_line" ADD CONSTRAINT "equipment_confirmation_line_type_id_equipment_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."equipment_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_confirmation_line" ADD CONSTRAINT "equipment_confirmation_line_item_id_equipment_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."equipment_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_confirmation_line" ADD CONSTRAINT "equipment_confirmation_line_guardian_user_id_user_id_fk" FOREIGN KEY ("guardian_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "equipment_confirmation_line_item_idx" ON "equipment_confirmation_line" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "equipment_confirmation_line_guardian_type_idx" ON "equipment_confirmation_line" USING btree ("guardian_user_id","type_id");--> statement-breakpoint
ALTER TABLE "equipment_request" ADD CONSTRAINT "equipment_request_confirmed_by_user_id_user_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_loan" DROP COLUMN "request_id";