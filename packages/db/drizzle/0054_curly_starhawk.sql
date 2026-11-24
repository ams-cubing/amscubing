CREATE TABLE "ams_competition_scale_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"tiers" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by_user_id" text
);
--> statement-breakpoint
ALTER TABLE "ams_competition_scale_config" ADD CONSTRAINT "ams_competition_scale_config_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "ams_competition_scale_config" ("id", "tiers") VALUES (
	1,
	'[
		{"level":"debutante","labelEs":"Debutante","maxCompetitors":80,"maxStations":8,"maxEvents":7,"minDelegates":1,"delegatesOpenEnded":false,"minOrganizerCompetitions":1},
		{"level":"super","labelEs":"Super","maxCompetitors":120,"maxStations":10,"maxEvents":9,"minDelegates":1,"delegatesOpenEnded":false,"minOrganizerCompetitions":2},
		{"level":"experto","labelEs":"Experto","maxCompetitors":180,"maxStations":16,"maxEvents":12,"minDelegates":2,"delegatesOpenEnded":false,"minOrganizerCompetitions":3},
		{"level":"maestro","labelEs":"Maestro","maxCompetitors":240,"maxStations":20,"maxEvents":15,"minDelegates":3,"delegatesOpenEnded":false,"minOrganizerCompetitions":5},
		{"level":"leyenda","labelEs":"Leyenda","maxCompetitors":null,"maxStations":null,"maxEvents":17,"minDelegates":4,"delegatesOpenEnded":true,"minOrganizerCompetitions":6}
	]'::jsonb
) ON CONFLICT ("id") DO NOTHING;