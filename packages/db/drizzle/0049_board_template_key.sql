ALTER TABLE "board" ADD COLUMN "template_key" text;--> statement-breakpoint
UPDATE "board" SET "template_key" = 'competition' WHERE "competition_id" IS NOT NULL OR ("is_template" = true AND "name" = 'Plantilla AMS — Organización de competencia');
