CREATE TYPE "public"."equipment_acquisition_kind" AS ENUM('purchase', 'donation', 'sponsorship', 'sale', 'disposal');--> statement-breakpoint
CREATE TYPE "public"."equipment_category" AS ENUM('timer', 'display', 'accessory', 'other');--> statement-breakpoint
CREATE TYPE "public"."equipment_event_action" AS ENUM('item_created', 'item_updated', 'status_changed', 'transferred', 'stock_adjusted', 'loaned', 'returned', 'acquisition_recorded', 'retired');--> statement-breakpoint
CREATE TYPE "public"."equipment_status" AS ENUM('functional', 'faulty', 'in_repair', 'lost', 'retired');--> statement-breakpoint
CREATE TYPE "public"."equipment_tracking" AS ENUM('serialized', 'bulk');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'equipment_loaned';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'equipment_returned';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'equipment_transferred';--> statement-breakpoint
CREATE TABLE "equipment_acquisition_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"acquisition_id" integer NOT NULL,
	"type_id" integer NOT NULL,
	"quantity_delta" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_acquisition" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"source" text NOT NULL,
	"kind" "equipment_acquisition_kind" NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" "equipment_event_action" NOT NULL,
	"actor_id" text NOT NULL,
	"item_id" integer,
	"type_id" integer,
	"guardian_user_id" text,
	"quantity_delta" integer,
	"loan_id" integer,
	"acquisition_id" integer,
	"from_user_id" text,
	"to_user_id" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"type_id" integer NOT NULL,
	"guardian_user_id" text,
	"status" "equipment_status" DEFAULT 'functional' NOT NULL,
	"acquisition_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_item_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "equipment_loan_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"type_id" integer NOT NULL,
	"item_id" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"returned_quantity" integer DEFAULT 0 NOT NULL,
	"returned_at" timestamp,
	"return_status" "equipment_status"
);
--> statement-breakpoint
CREATE TABLE "equipment_loan" (
	"id" serial PRIMARY KEY NOT NULL,
	"borrower_user_id" text NOT NULL,
	"lent_by_user_id" text NOT NULL,
	"competition_id" integer,
	"reason" text NOT NULL,
	"loaned_at" date NOT NULL,
	"due_at" date,
	"returned_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_sku_counter" (
	"prefix" text NOT NULL,
	"year" integer NOT NULL,
	"next" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "equipment_sku_counter_prefix_year_pk" PRIMARY KEY("prefix","year")
);
--> statement-breakpoint
CREATE TABLE "equipment_stock" (
	"id" serial PRIMARY KEY NOT NULL,
	"type_id" integer NOT NULL,
	"guardian_user_id" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_stock_type_guardian_unique" UNIQUE("type_id","guardian_user_id")
);
--> statement-breakpoint
CREATE TABLE "equipment_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sku_prefix" text NOT NULL,
	"category" "equipment_category" NOT NULL,
	"tracking" "equipment_tracking" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_type_sku_prefix_unique" UNIQUE("sku_prefix")
);
--> statement-breakpoint
ALTER TABLE "equipment_acquisition_line" ADD CONSTRAINT "equipment_acquisition_line_acquisition_id_equipment_acquisition_id_fk" FOREIGN KEY ("acquisition_id") REFERENCES "public"."equipment_acquisition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_acquisition_line" ADD CONSTRAINT "equipment_acquisition_line_type_id_equipment_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."equipment_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_acquisition" ADD CONSTRAINT "equipment_acquisition_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_event" ADD CONSTRAINT "equipment_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_event" ADD CONSTRAINT "equipment_event_item_id_equipment_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."equipment_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_event" ADD CONSTRAINT "equipment_event_type_id_equipment_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."equipment_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_event" ADD CONSTRAINT "equipment_event_guardian_user_id_user_id_fk" FOREIGN KEY ("guardian_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_event" ADD CONSTRAINT "equipment_event_loan_id_equipment_loan_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."equipment_loan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_event" ADD CONSTRAINT "equipment_event_acquisition_id_equipment_acquisition_id_fk" FOREIGN KEY ("acquisition_id") REFERENCES "public"."equipment_acquisition"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_event" ADD CONSTRAINT "equipment_event_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_event" ADD CONSTRAINT "equipment_event_to_user_id_user_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_item" ADD CONSTRAINT "equipment_item_type_id_equipment_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."equipment_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_item" ADD CONSTRAINT "equipment_item_guardian_user_id_user_id_fk" FOREIGN KEY ("guardian_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_item" ADD CONSTRAINT "equipment_item_acquisition_id_equipment_acquisition_id_fk" FOREIGN KEY ("acquisition_id") REFERENCES "public"."equipment_acquisition"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_loan_line" ADD CONSTRAINT "equipment_loan_line_loan_id_equipment_loan_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."equipment_loan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_loan_line" ADD CONSTRAINT "equipment_loan_line_type_id_equipment_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."equipment_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_loan_line" ADD CONSTRAINT "equipment_loan_line_item_id_equipment_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."equipment_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_loan" ADD CONSTRAINT "equipment_loan_borrower_user_id_user_id_fk" FOREIGN KEY ("borrower_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_loan" ADD CONSTRAINT "equipment_loan_lent_by_user_id_user_id_fk" FOREIGN KEY ("lent_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_loan" ADD CONSTRAINT "equipment_loan_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_stock" ADD CONSTRAINT "equipment_stock_type_id_equipment_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."equipment_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_stock" ADD CONSTRAINT "equipment_stock_guardian_user_id_user_id_fk" FOREIGN KEY ("guardian_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "equipment_acquisition_line_acquisition_idx" ON "equipment_acquisition_line" USING btree ("acquisition_id");--> statement-breakpoint
CREATE INDEX "equipment_acquisition_date_idx" ON "equipment_acquisition" USING btree ("date");--> statement-breakpoint
CREATE INDEX "equipment_event_item_idx" ON "equipment_event" USING btree ("item_id","created_at");--> statement-breakpoint
CREATE INDEX "equipment_event_loan_idx" ON "equipment_event" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "equipment_event_created_idx" ON "equipment_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "equipment_item_guardian_idx" ON "equipment_item" USING btree ("guardian_user_id");--> statement-breakpoint
CREATE INDEX "equipment_item_type_idx" ON "equipment_item" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "equipment_loan_line_loan_idx" ON "equipment_loan_line" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "equipment_loan_line_item_idx" ON "equipment_loan_line" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "equipment_loan_borrower_idx" ON "equipment_loan" USING btree ("borrower_user_id");--> statement-breakpoint
CREATE INDEX "equipment_loan_lent_by_idx" ON "equipment_loan" USING btree ("lent_by_user_id");--> statement-breakpoint
CREATE INDEX "equipment_stock_guardian_idx" ON "equipment_stock" USING btree ("guardian_user_id");