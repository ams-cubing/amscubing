CREATE TYPE "public"."competition_budget_line_category" AS ENUM('sede', 'viaticos_transporte', 'viaticos_hospedaje', 'viaticos_alimentos', 'materiales', 'comida_staff', 'premios', 'papeleria', 'cuota_wca', 'cuota_ams', 'inscripciones', 'patrocinio_efectivo', 'otros');--> statement-breakpoint
CREATE TYPE "public"."competition_budget_line_kind" AS ENUM('expense', 'income');--> statement-breakpoint
CREATE TYPE "public"."competition_budget_receipt_status" AS ENUM('pending', 'in_drive', 'missing_reason');--> statement-breakpoint
CREATE TYPE "public"."competition_budget_spend_status" AS ENUM('none', 'proposed', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."competition_budget_status" AS ENUM('draft', 'plan_submitted', 'plan_approved', 'mid_submitted', 'mid_approved', 'final_submitted', 'closed');--> statement-breakpoint
CREATE TYPE "public"."competition_sponsor_type" AS ENUM('cash', 'in_kind');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'budget_plan_submitted';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'budget_expense_proposed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'budget_mid_submitted';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'budget_final_submitted';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'budget_stage_approved';--> statement-breakpoint
CREATE TABLE "competition_budget_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"budget_id" integer NOT NULL,
	"kind" "competition_budget_line_kind" NOT NULL,
	"category" "competition_budget_line_category" NOT NULL,
	"label" text NOT NULL,
	"expected_cents" integer DEFAULT 0 NOT NULL,
	"actual_cents" integer,
	"spend_status" "competition_budget_spend_status" DEFAULT 'none' NOT NULL,
	"receipt_status" "competition_budget_receipt_status" DEFAULT 'pending' NOT NULL,
	"receipt_missing_reason" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"spend_approved_by_user_id" text,
	"spend_approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competition_budget" (
	"id" serial PRIMARY KEY NOT NULL,
	"competition_id" integer NOT NULL,
	"status" "competition_budget_status" DEFAULT 'draft' NOT NULL,
	"proposed_registration_fee_cents" integer DEFAULT 0 NOT NULL,
	"expected_competitor_count" integer DEFAULT 0 NOT NULL,
	"registration_revenue_cents" integer,
	"receipts_drive_url" text,
	"spreadsheet_url" text,
	"remanente_note" text,
	"remanente_decision" text,
	"plan_submitted_by_user_id" text,
	"plan_submitted_at" timestamp,
	"plan_approved_by_user_id" text,
	"plan_approved_at" timestamp,
	"mid_submitted_by_user_id" text,
	"mid_submitted_at" timestamp,
	"mid_approved_by_user_id" text,
	"mid_approved_at" timestamp,
	"final_submitted_by_user_id" text,
	"final_submitted_at" timestamp,
	"closed_by_user_id" text,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "competition_budget_competition_id_unique" UNIQUE("competition_id")
);
--> statement-breakpoint
CREATE TABLE "competition_sponsor" (
	"id" serial PRIMARY KEY NOT NULL,
	"competition_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" "competition_sponsor_type" NOT NULL,
	"amount_cents" integer,
	"conditions" text,
	"logo_url" text,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "competition_sponsor_competition_name_unique" UNIQUE("competition_id","name")
);
--> statement-breakpoint
ALTER TABLE "competition_budget_line" ADD CONSTRAINT "competition_budget_line_budget_id_competition_budget_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."competition_budget"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_budget_line" ADD CONSTRAINT "competition_budget_line_spend_approved_by_user_id_user_id_fk" FOREIGN KEY ("spend_approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_budget" ADD CONSTRAINT "competition_budget_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_budget" ADD CONSTRAINT "competition_budget_plan_submitted_by_user_id_user_id_fk" FOREIGN KEY ("plan_submitted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_budget" ADD CONSTRAINT "competition_budget_plan_approved_by_user_id_user_id_fk" FOREIGN KEY ("plan_approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_budget" ADD CONSTRAINT "competition_budget_mid_submitted_by_user_id_user_id_fk" FOREIGN KEY ("mid_submitted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_budget" ADD CONSTRAINT "competition_budget_mid_approved_by_user_id_user_id_fk" FOREIGN KEY ("mid_approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_budget" ADD CONSTRAINT "competition_budget_final_submitted_by_user_id_user_id_fk" FOREIGN KEY ("final_submitted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_budget" ADD CONSTRAINT "competition_budget_closed_by_user_id_user_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_sponsor" ADD CONSTRAINT "competition_sponsor_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_sponsor" ADD CONSTRAINT "competition_sponsor_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competition_budget_line_budget_idx" ON "competition_budget_line" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "competition_sponsor_competition_idx" ON "competition_sponsor" USING btree ("competition_id");