ALTER TABLE "board" ADD COLUMN "boards_tools_beta" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DELETE FROM "beta_feature_grant" WHERE "feature_key" = 'boards_tools';
