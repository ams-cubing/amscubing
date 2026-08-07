CREATE TABLE "card_comment" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" integer NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_member" (
	"card_id" integer NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "card_member_card_id_user_id_unique" UNIQUE("card_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "card_comment" ADD CONSTRAINT "card_comment_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_comment" ADD CONSTRAINT "card_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_member" ADD CONSTRAINT "card_member_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_member" ADD CONSTRAINT "card_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_comment_card_idx" ON "card_comment" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "card_comment_author_idx" ON "card_comment" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "card_member_card_idx" ON "card_member" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "card_member_user_idx" ON "card_member" USING btree ("user_id");