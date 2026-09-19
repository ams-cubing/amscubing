import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Singleton row id for the Torneo de Rubik Facebook page cover. */
export const FACEBOOK_COVER_STATE_ID = "torneo_de_rubik" as const;

/**
 * Last successfully uploaded Facebook page cover for Torneo de Rubik.
 * Single-row table keyed by {@link FACEBOOK_COVER_STATE_ID}.
 */
export const facebookCoverState = pgTable("facebook_cover_state", {
  id: text("id").primaryKey(),
  pngHash: text("png_hash").notNull(),
  inputsFingerprint: text("inputs_fingerprint").notNull(),
  slotCount: integer("slot_count").notNull(),
  photoId: text("photo_id"),
  uploadedAt: timestamp("uploaded_at").notNull(),
});
