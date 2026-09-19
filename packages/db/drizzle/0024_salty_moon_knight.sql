CREATE TABLE "facebook_cover_state" (
	"id" text PRIMARY KEY NOT NULL,
	"png_hash" text NOT NULL,
	"inputs_fingerprint" text NOT NULL,
	"slot_count" integer NOT NULL,
	"photo_id" text,
	"uploaded_at" timestamp NOT NULL
);
