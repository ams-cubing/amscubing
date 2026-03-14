"use cache";

import "server-only";

import {
  and,
  asc,
  count,
  desc,
  gt,
  gte,
  ilike,
  inArray,
  lte,
  eq,
  sql,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { competitions, states } from "@/db/schema";

import { filterColumns } from "@/lib/filter-columns";

import type { GetCompetitionsSchema } from "./validations";

export async function getCompetitions(input: GetCompetitionsSchema) {
  cacheLife({ revalidate: 1, stale: 1, expire: 60 });
  cacheTag("competitions");

  try {
    const offset = (input.page - 1) * input.perPage;
    const advancedTable =
      input.filterFlag === "advancedFilters" ||
      input.filterFlag === "commandFilters";

    const advancedWhere = filterColumns({
      table: competitions,
      filters: input.filters,
      joinOperator: input.joinOperator,
    });

    const where = advancedTable
      ? advancedWhere
      : and(
          input.name ? ilike(competitions.name, `%${input.name}%`) : undefined,
          input.state.length > 0
            ? inArray(states.name, input.state)
            : undefined,
          input.statusPublic.length > 0
            ? inArray(competitions.statusPublic, input.statusPublic)
            : undefined,
          input.statusInternal.length > 0
            ? inArray(competitions.statusInternal, input.statusInternal)
            : undefined,
          input.createdAt.length > 0
            ? and(
                input.createdAt[0]
                  ? gte(
                      competitions.createdAt,
                      (() => {
                        const date = new Date(input.createdAt[0]);
                        date.setHours(0, 0, 0, 0);
                        return date;
                      })(),
                    )
                  : undefined,
                input.createdAt[1]
                  ? lte(
                      competitions.createdAt,
                      (() => {
                        const date = new Date(input.createdAt[1]);
                        date.setHours(23, 59, 59, 999);
                        return date;
                      })(),
                    )
                  : undefined,
              )
            : undefined,
        );

    const orderBy =
      input.sort.length > 0
        ? input.sort.map((item) =>
            item.desc
              ? desc(competitions[item.id])
              : asc(competitions[item.id]),
          )
        : [asc(competitions.startDate)];

    const { data, total } = await db.transaction(async (tx) => {
      const data = await tx
        .select({
            id: competitions.id,
            name: competitions.name,
            city: competitions.city,
            state: states.name,
            delegates: sql<{ wcaId: string; name: string; image: string | null; isPrimary: boolean }[]>`
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'wcaId', u.wca_id,
                  'name', u.name,
                  'image', u.image,
                  'isPrimary', cd.is_primary
                ))
                FROM competition_delegate cd
                JOIN "user" u ON u.wca_id = cd.delegate_wca_id
                WHERE cd.competition_id = ${competitions.id}),
                '[]'::json
              )
            `,
            requestedBy: competitions.requestedBy,
            trelloUrl: competitions.trelloUrl,
            wcaCompetitionUrl: competitions.wcaCompetitionUrl,
            startDate: competitions.startDate,
            endDate: competitions.endDate,
            capacity: competitions.capacity,
            statusPublic: competitions.statusPublic,
            statusInternal: competitions.statusInternal,
            notes: competitions.notes,
            trelloAssignedAt: competitions.trelloAssignedAt,
            ultimatumSetTo: competitions.ultimatumSetTo,
            createdAt: competitions.createdAt,
            updatedAt: competitions.updatedAt,
        })
        .from(competitions)
        .innerJoin(states, eq(states.id, competitions.stateId))
        .limit(input.perPage)
        .offset(offset)
        .where(where)
        .orderBy(...orderBy);

      const total = await tx
        .select({
          count: count(),
        })
        .from(competitions)
        .innerJoin(states, eq(states.id, competitions.stateId))
        .where(where)
        .execute()
        .then((res) => res[0]?.count ?? 0);

      return {
        data,
        total,
      };
    });

    const pageCount = Math.ceil(total / input.perPage);
    return { data, pageCount };
  } catch {
    return { data: [], pageCount: 0 };
  }
}

export async function getCompetitionStatusPublicCounts() {
  cacheLife("hours");
  cacheTag("competition-public-status-counts");

  try {
    return await db
      .select({
        statusPublic: competitions.statusPublic,
        count: count(),
      })
      .from(competitions)
      .groupBy(competitions.statusPublic)
      .having(gt(count(competitions.statusPublic), 0))
      .then((res) =>
        res.reduce(
          (acc, { statusPublic, count }) => {
            acc[statusPublic] = count;
            return acc;
          },
          {
            open: 0,
            reserved: 0,
            confirmed: 0,
            announced: 0,
            suspended: 0,
            unavailable: 0,
          },
        ),
      );
  } catch {
    return {
      open: 0,
      reserved: 0,
      confirmed: 0,
      announced: 0,
      suspended: 0,
      unavailable: 0,
    };
  }
}

export async function getCompetitionStatusInternalCounts() {
  cacheLife("hours");
  cacheTag("competition-status-internal-counts");

  try {
    return await db
      .select({
        statusInternal: competitions.statusInternal,
        count: count(),
      })
      .from(competitions)
      .groupBy(competitions.statusInternal)
      .having(gt(count(), 0))
      .then((res) =>
        res.reduce(
          (acc, { statusInternal, count }) => {
            acc[statusInternal] = count;
            return acc;
          },
          {
            asked_for_help: 0,
            looking_for_venue: 0,
            venue_found: 0,
            wca_approved: 0,
            registration_open: 0,
            celebrated: 0,
            cancelled: 0,
          },
        ),
      );
  } catch {
    return {
      asked_for_help: 0,
      looking_for_venue: 0,
      venue_found: 0,
      wca_approved: 0,
      registration_open: 0,
      celebrated: 0,
      cancelled: 0,
    };
  }
}

export async function getCompetitionStateCounts() {
  cacheLife("hours");
  cacheTag("competition-state-counts");

  try {
    return await db
      .select({
        state: states.name,
        count: count(),
      })
      .from(competitions)
      .innerJoin(states, eq(states.id, competitions.stateId))
      .groupBy(states.name)
      .having(gt(count(), 0))
      .then((res) =>
        res.reduce<Record<string, number>>((acc, { state, count }) => {
          acc[state] = count;
          return acc;
        }, {}),
      );
  } catch {
    return {};
  }
}
