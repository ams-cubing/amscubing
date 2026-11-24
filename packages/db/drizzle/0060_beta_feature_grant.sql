CREATE TABLE "beta_feature_grant" (
	"user_id" text NOT NULL,
	"feature_key" text NOT NULL,
	"granted_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "beta_feature_grant_user_id_feature_key_pk" PRIMARY KEY("user_id","feature_key")
);
--> statement-breakpoint
ALTER TABLE "beta_feature_grant" ADD CONSTRAINT "beta_feature_grant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_feature_grant" ADD CONSTRAINT "beta_feature_grant_granted_by_user_id_user_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'beta_feature_changed';
