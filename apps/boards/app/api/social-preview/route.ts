import { NextResponse } from "next/server";

import { buildAnnouncementPreview } from "@workspace/social";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      wcaCompetitionUrl?: string | null;
      city?: string;
      stateName?: string | null;
      name?: string | null;
      startDate?: string;
      endDate?: string;
      capacity?: number | null;
      socialCustomText?: string;
      socialTags?: string | null;
      socialFlyerUrl?: string | null;
    };

    if (!body.city || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { ok: false, message: "Faltan datos de la competencia" },
        { status: 400 },
      );
    }

    const preview = await buildAnnouncementPreview({
      wcaCompetitionUrl: body.wcaCompetitionUrl ?? "",
      city: body.city,
      stateName: body.stateName,
      name: body.name ?? null,
      startDate: body.startDate,
      endDate: body.endDate,
      capacity: body.capacity,
      socialCustomText: body.socialCustomText ?? "",
      socialTags: body.socialTags,
      socialFlyerUrl: body.socialFlyerUrl,
    });

    if (!preview.ok) {
      return NextResponse.json(preview);
    }

    return NextResponse.json({
      ok: true,
      caption: preview.caption,
      imageUrl: preview.imageUrl,
    });
  } catch (error) {
    console.error("social-preview error:", error);
    return NextResponse.json(
      { ok: false, message: "Error al generar preview" },
      { status: 500 },
    );
  }
}
