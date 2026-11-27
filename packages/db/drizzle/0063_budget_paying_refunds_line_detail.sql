ALTER TABLE "competition_budget" ADD COLUMN "paying_competitor_count" integer;--> statement-breakpoint
ALTER TABLE "competition_budget" ADD COLUMN "refunded_stripe_charge_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "competition_budget_line" ADD COLUMN "expected_quantity" integer;--> statement-breakpoint
ALTER TABLE "competition_budget_line" ADD COLUMN "expected_unit_cents" integer;--> statement-breakpoint
ALTER TABLE "competition_budget_line" ADD COLUMN "actual_quantity" integer;--> statement-breakpoint
ALTER TABLE "competition_budget_line" ADD COLUMN "actual_unit_cents" integer;
