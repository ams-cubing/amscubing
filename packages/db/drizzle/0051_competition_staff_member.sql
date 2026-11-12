CREATE TABLE "competition_staff_member" (
	"id" serial PRIMARY KEY NOT NULL,
	"competition_id" integer NOT NULL,
	"name" text NOT NULL,
	"wca_id" text,
	"email" text,
	"activities" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "competition_staff_member_wca_id_unique" UNIQUE("competition_id","wca_id"),
	CONSTRAINT "competition_staff_member_email_unique" UNIQUE("competition_id","email"),
	CONSTRAINT "competition_staff_member_activities_check" CHECK ("competition_staff_member"."activities" <@ array['judge', 'scrambler', 'runner', 'registration', 'data_entry']::text[])
);
--> statement-breakpoint
ALTER TABLE "competition_staff_member" ADD CONSTRAINT "competition_staff_member_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_staff_member" ADD CONSTRAINT "competition_staff_member_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "card_attachment" SET "url" = 'https://cursos.amscubing.org/cursos/capacitacion-de-staff-ams' WHERE "url" = 'https://amscubing.org/detalle-cursos/' AND "name" = 'Curso de Staff AMS';
