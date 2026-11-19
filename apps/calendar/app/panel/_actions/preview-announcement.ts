"use server";

import { db } from "@workspace/db";
import { competitions } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { buildAnnouncementPreview } from "@workspace/social";
import { getErrorMessage } from "@/lib/handle-error";
import { requireDelegate } from "@/lib/session";
import { log } from "@workspace/server/log";

export type AnnouncementPreviewSources = {
  bodyText: "custom" | "wca_intro";
  hasTags: boolean;
  imageSource: "flyer" | "logo" | "none";
};

export type AnnouncementPreview = {
  displayName: string;
  wcaUrl: string;
  imageUrl: string | null;
  caption: string;
  sources: AnnouncementPreviewSources;
};

export async function previewAnnouncement(
  competitionId: number,
  wcaCompetitionUrl: string,
): Promise<
  | { success: true; preview: AnnouncementPreview }
  | { success: false; message: string }
> {
  const authResult = await requireDelegate();
  if (!authResult.ok) {
    return { success: false, message: authResult.message };
  }

  try {
    const competition = await db.query.competitions.findFirst({
      where: eq(competitions.id, competitionId),
      columns: {
        city: true,
        name: true,
        startDate: true,
        endDate: true,
        capacity: true,
        socialCustomText: true,
        socialTags: true,
        socialFlyerUrl: true,
      },
      with: {
        state: { columns: { name: true } },
      },
    });

    if (!competition) {
      return { success: false, message: "Competencia no encontrada" };
    }

    const result = await buildAnnouncementPreview({
      wcaCompetitionUrl,
      city: competition.city,
      stateName: competition.state?.name ?? null,
      name: competition.name,
      startDate: competition.startDate,
      endDate: competition.endDate,
      capacity: competition.capacity,
      socialCustomText: competition.socialCustomText ?? "",
      socialTags: competition.socialTags,
      socialFlyerUrl: competition.socialFlyerUrl,
    });

    if (!result.ok) {
      return { success: false, message: result.message };
    }

    const hasCustomText = Boolean(competition.socialCustomText?.trim());
    const imageSource: AnnouncementPreviewSources["imageSource"] = result
      .flyerUrl
      ? "flyer"
      : result.logoUrl
        ? "logo"
        : "none";

    return {
      success: true,
      preview: {
        displayName: result.displayName,
        wcaUrl: result.wcaUrl,
        imageUrl: result.imageUrl,
        caption: result.caption,
        sources: {
          bodyText: hasCustomText ? "custom" : "wca_intro",
          hasTags: Boolean(competition.socialTags?.trim()),
          imageSource,
        },
      },
    };
  } catch (error) {
    log.error("calendar.announcement_preview_failed", { error });
    return { success: false, message: getErrorMessage(error) };
  }
}
