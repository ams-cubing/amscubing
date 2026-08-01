CREATE TABLE "board_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"board_id" integer NOT NULL,
	"title" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"competition_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "board_competition_id_unique" UNIQUE("competition_id")
);
--> statement-breakpoint
CREATE TABLE "card_attachment" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" integer NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_label" (
	"card_id" integer NOT NULL,
	"label_id" integer NOT NULL,
	CONSTRAINT "card_label_card_id_label_id_unique" UNIQUE("card_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "card" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"cover_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"checklist_id" integer NOT NULL,
	"title" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" integer NOT NULL,
	"title" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "label" (
	"id" serial PRIMARY KEY NOT NULL,
	"board_id" integer NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "board_id" integer;--> statement-breakpoint
ALTER TABLE "board_list" ADD CONSTRAINT "board_list_board_id_board_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board" ADD CONSTRAINT "board_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_attachment" ADD CONSTRAINT "card_attachment_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_label" ADD CONSTRAINT "card_label_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_label" ADD CONSTRAINT "card_label_label_id_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_list_id_board_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."board_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_item" ADD CONSTRAINT "checklist_item_checklist_id_checklist_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist" ADD CONSTRAINT "checklist_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label" ADD CONSTRAINT "label_board_id_board_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "board_list_board_idx" ON "board_list" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "card_attachment_card_idx" ON "card_attachment" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "card_label_card_idx" ON "card_label" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "card_list_idx" ON "card" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "checklist_item_checklist_idx" ON "checklist_item" USING btree ("checklist_id");--> statement-breakpoint
CREATE INDEX "checklist_card_idx" ON "checklist" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "label_board_idx" ON "label" USING btree ("board_id");--> statement-breakpoint
ALTER TABLE "competition" ADD CONSTRAINT "competition_board_id_board_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."board"("id") ON DELETE set null ON UPDATE no action;