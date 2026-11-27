ALTER TYPE "public"."competition_budget_line_category" ADD VALUE 'comision_stripe';--> statement-breakpoint
ALTER TABLE "competition_budget" ADD COLUMN "uses_stripe" boolean DEFAULT false NOT NULL;
