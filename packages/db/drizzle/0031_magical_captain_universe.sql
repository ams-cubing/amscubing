ALTER TABLE "competition_organizer" ADD COLUMN "organizer_user_id" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "requested_by_user_id" text;--> statement-breakpoint
ALTER TABLE "date_request" ADD COLUMN "requested_by_user_id" text;--> statement-breakpoint
ALTER TABLE "competition_organizer" ADD CONSTRAINT "competition_organizer_organizer_user_id_user_id_fk" FOREIGN KEY ("organizer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition" ADD CONSTRAINT "competition_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_request" ADD CONSTRAINT "date_request_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
UPDATE "competition_organizer" co SET "organizer_user_id" = u."id" FROM "user" u WHERE u."wca_id" = co."organizer_wca_id";--> statement-breakpoint
UPDATE "competition" c SET "requested_by_user_id" = u."id" FROM "user" u WHERE u."wca_id" = c."requested_by";--> statement-breakpoint
UPDATE "date_request" dr SET "requested_by_user_id" = u."id" FROM "user" u WHERE u."wca_id" = dr."requested_by";