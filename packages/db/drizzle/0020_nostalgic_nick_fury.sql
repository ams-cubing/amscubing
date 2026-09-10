CREATE TABLE "boards_organizer_allowlist" (
	"wca_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by_user_id" text
);
--> statement-breakpoint
ALTER TABLE "boards_organizer_allowlist" ADD CONSTRAINT "boards_organizer_allowlist_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "boards_organizer_allowlist_created_by_idx" ON "boards_organizer_allowlist" USING btree ("created_by_user_id");