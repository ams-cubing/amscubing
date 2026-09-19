import { createHash } from "node:crypto";

import type { CoverSlotInput } from "./cover-image";

export type CoverStatus = "current" | "outdated" | "unknown";

/** Render-affecting fields only (registration dates are fetched but not painted). */
export function coverInputsFingerprint(inputs: CoverSlotInput[]): string {
  const normalized = inputs.map((input) => ({
    city: input.city,
    stateName: input.stateName ?? null,
    startDate: input.startDate,
    endDate: input.endDate,
    logoUrl: input.logoUrl ?? null,
  }));
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export function classifyCoverStatus(
  storedFingerprint: string | null | undefined,
  currentFingerprint: string,
): CoverStatus {
  if (!storedFingerprint) return "unknown";
  if (storedFingerprint !== currentFingerprint) return "outdated";
  return "current";
}
