CREATE TABLE "board_invite" (
	"id" serial PRIMARY KEY NOT NULL,
	"board_id" integer NOT NULL,
	"token" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "board_invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "board_member" (
	"board_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "board_member_board_id_user_id_unique" UNIQUE("board_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "board" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "board_invite" ADD CONSTRAINT "board_invite_board_id_board_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_invite" ADD CONSTRAINT "board_invite_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_member" ADD CONSTRAINT "board_member_board_id_board_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_member" ADD CONSTRAINT "board_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "board_invite_board_idx" ON "board_invite" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "board_invite_token_idx" ON "board_invite" USING btree ("token");--> statement-breakpoint
CREATE INDEX "board_member_board_idx" ON "board_member" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "board_member_user_idx" ON "board_member" USING btree ("user_id");