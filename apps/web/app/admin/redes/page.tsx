import type { Metadata } from "next";
import { desc, eq, sql } from "drizzle-orm";

import { db } from "@workspace/db";
import { competitions } from "@workspace/db/schema";
import {
  buildAnnouncementPreview,
  facebookPostUrl,
  fetchInstagramPermalink,
} from "@workspace/social";

import {
  SocialPostsList,
  type SocialPostRow,
} from "@/app/admin/redes/social-posts-list";

export const metadata: Metadata = {
  title: "Redes | Admin AMS",
  description:
    "Revisa y reintenta publicaciones de competencias en Torneo de Rubik.",
};

function socialStatus(
  facebookPostId: string | null,
  instagramMediaId: string | null,
): SocialPostRow["status"] {
  if (facebookPostId && instagramMediaId) return "fb_ig";
  if (facebookPostId) return "fb_only";
  return "missing";
}

export default async function AdminRedesPage() {
  const rows = await db.query.competitions.findMany({
    where: eq(competitions.statusPublic, "announced"),
    orderBy: [
      sql`${competitions.announcedPostedAt} DESC NULLS LAST`,
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
      socialCustomText: true,
      socialTags: true,
      socialFlyerUrl: true,
    },
    with: {
      state: { columns: { name: true } },
    },
    limit: 100,
  });

  const list: SocialPostRow[] = await Promise.all(
    rows.map(async (row) => {
      const preview =
        row.wcaCompetitionUrl && row.socialCustomText?.trim()
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
          : row.socialCustomText?.trim()
            ? {
                ok: false as const,
                message: "Falta la URL de la competencia en la WCA.",
              }
            : {
                ok: false as const,
                message:
                  "Falta el texto personalizado (tarjeta Publicación redes Torneo de Rubik).",
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
        status: socialStatus(row.facebookPostId, row.instagramMediaId),
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
          puedes ver el preview, reintentar o completar Instagram.
        </p>
      </header>

      <section className="space-y-6 rounded-5.5 bg-ams-soft p-6 md:p-8">
        <h3 className="ams-display text-2xl leading-none text-ams-navy">
          Anunciadas ({list.length})
        </h3>
        <SocialPostsList rows={list} />
      </section>
    </div>
  );
}
