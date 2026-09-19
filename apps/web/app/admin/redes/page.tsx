import type { Metadata } from "next";
import { connection } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@workspace/db";
import { competitions } from "@workspace/db/schema";
import {
  buildAnnouncementPreview,
  facebookPostUrl,
  fetchInstagramPermalink,
  getTorneoDeRubikCoverStatus,
} from "@workspace/social";

import {
  SocialPostsList,
  type SocialPostRow,
} from "@/app/admin/redes/social-posts-list";
import { FacebookCoverPanel } from "@/app/admin/redes/facebook-cover-panel";

export const metadata: Metadata = {
  title: "Redes | Admin AMS",
  description:
    "Revisa y reintenta publicaciones de competencias en Torneo de Rubik.",
};

function todayMexicoIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
  }).format(new Date());
}

function socialStatus(
  facebookPostId: string | null,
  instagramMediaId: string | null,
  socialPublishedManually: boolean,
): SocialPostRow["status"] {
  if (facebookPostId && instagramMediaId) return "fb_ig";
  if (facebookPostId) return "fb_only";
  if (socialPublishedManually) return "manual";
  return "missing";
}

export default async function AdminRedesPage() {
  await connection();

  const today = todayMexicoIsoDate();

  const rows = await db.query.competitions.findMany({
    where: and(
      eq(competitions.statusPublic, "announced"),
      gte(competitions.endDate, today),
    ),
    orderBy: [
      // Unpublished (no FB id and not manual) first, then by start date desc
      sql`CASE WHEN ${competitions.facebookPostId} IS NULL AND ${competitions.socialPublishedManually} = false THEN 0 ELSE 1 END`,
      desc(competitions.startDate),
    ],
    columns: {
      id: true,
      name: true,
      city: true,
      startDate: true,
      endDate: true,
      capacity: true,
      wcaCompetitionUrl: true,
      announcedPostedAt: true,
      facebookPostId: true,
      instagramMediaId: true,
      socialPublishedManually: true,
      socialCustomText: true,
      socialTags: true,
      socialFlyerUrl: true,
    },
    with: {
      state: { columns: { name: true } },
    },
    limit: 300,
  });

  const coverStatus = await getTorneoDeRubikCoverStatus();

  const list: SocialPostRow[] = await Promise.all(
    rows.map(async (row) => {
      const preview = row.wcaCompetitionUrl
        ? await buildAnnouncementPreview({
            wcaCompetitionUrl: row.wcaCompetitionUrl,
            city: row.city,
            stateName: row.state?.name ?? null,
            name: row.name,
            startDate: row.startDate,
            endDate: row.endDate,
            capacity: row.capacity,
            socialCustomText: row.socialCustomText,
            socialTags: row.socialTags,
            socialFlyerUrl: row.socialFlyerUrl,
          })
        : {
            ok: false as const,
            message: "Falta la URL de la competencia en la WCA.",
          };

      const instagramUrl = row.instagramMediaId
        ? await fetchInstagramPermalink(row.instagramMediaId)
        : null;

      return {
        id: row.id,
        name: row.name,
        city: row.city,
        startDate: row.startDate,
        endDate: row.endDate,
        wcaCompetitionUrl: row.wcaCompetitionUrl,
        announcedPostedAt: row.announcedPostedAt?.toISOString() ?? null,
        facebookPostId: row.facebookPostId,
        facebookUrl: row.facebookPostId
          ? facebookPostUrl(row.facebookPostId)
          : null,
        instagramMediaId: row.instagramMediaId,
        instagramUrl,
        status: socialStatus(
          row.facebookPostId,
          row.instagramMediaId,
          row.socialPublishedManually,
        ),
        preview,
      };
    }),
  );

  return (
    <div className="space-y-12">
      <header>
        <p className="ams-heading text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
          Torneo de Rubik
        </p>
        <h2 className="ams-display mt-2 text-[clamp(1.8rem,4vw,2.75rem)] leading-none text-ams-navy">
          Publicaciones en redes
        </h2>
        <p className="ams-copy mt-3 max-w-2xl text-base leading-7 text-black/65">
          Competencias anunciadas con estado de Facebook e Instagram. El copy
          creativo, etiquetas y flyer viven en la tarjeta del tablero; aquí
          puedes ver el preview, reintentar, completar Instagram o marcar como
          publicada manualmente. La portada de la página se actualiza al
          anunciar o con el botón de abajo.
        </p>
      </header>

      <FacebookCoverPanel
        initialStatus={{
          status: coverStatus.status,
          slotCount: coverStatus.slotCount,
          uploadedAt: coverStatus.uploadedAt?.toISOString() ?? null,
        }}
      />

      <section className="space-y-6 rounded-5.5 bg-ams-soft p-6 md:p-8">
        <h3 className="ams-display text-2xl leading-none text-ams-navy">
          Anunciadas ({list.length})
        </h3>
        <SocialPostsList rows={list} />
      </section>
    </div>
  );
}
