ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'card_mention';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'card_ready_for_review';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'competition_readiness';
