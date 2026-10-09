CREATE TABLE "permission_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"target_id" text,
	"scope" text NOT NULL,
	"previous_role" text,
	"next_role" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"biography" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "permission_audit" ADD CONSTRAINT "permission_audit_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_audit" ADD CONSTRAINT "permission_audit_target_id_user_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;