import { and, eq } from "drizzle-orm";

import { db } from "@workspace/db";
import {
  boards,
  competitionDelegates,
  competitionOrganizers,
  competitions,
} from "@workspace/db/schema";

import { fetchWcaCompetition } from "@workspace/social";

import { getWcaAccessTokenForUser } from "@/lib/wca-access-token";
import {
  competitorRecipientsFromWcif,
  fetchAuthenticatedWcif,
  wcaCompetitionIdFromUrl,
  type AuthenticatedWcif,
} from "@/lib/wca-authenticated-wcif";

export type CompetitorEmailActionFail = { ok: false; message: string };

export async function assertCompetitionDelegateOrOrganizer(input: {
  competitionId: number;
  userId: string;
  wcaId: string | null;
}): Promise<CompetitorEmailActionFail | { ok: true }> {
  const [asOrganizer, asDelegate] = await Promise.all([
    db.query.competitionOrganizers.findFirst({
      where: and(
        eq(competitionOrganizers.competitionId, input.competitionId),
        eq(competitionOrganizers.organizerUserId, input.userId),
      ),
      columns: { organizerUserId: true },
    }),
    input.wcaId
      ? db.query.competitionDelegates.findFirst({
          where: and(
            eq(competitionDelegates.competitionId, input.competitionId),
            eq(competitionDelegates.delegateWcaId, input.wcaId),
          ),
          columns: { delegateWcaId: true },
        })
      : Promise.resolve(undefined),
  ]);

  if (!asOrganizer && !asDelegate) {
    return {
      ok: false,
      message:
        "Solo delegados u organizadores de la competencia pueden realizar esta acción.",
    };
  }
  return { ok: true };
}

export function formatCompetitionDateLabel(startDate: string, endDate: string) {
  const format = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: "America/Mexico_City",
  });
  const start = format.format(new Date(`${startDate}T12:00:00`));
  if (startDate === endDate) return start;
  const end = format.format(new Date(`${endDate}T12:00:00`));
  return `${start} – ${end}`;
}

export function placeLabel(city: string, stateName: string | null | undefined) {
  const state = stateName?.trim();
  return state ? `${city}, ${state}` : city;
}

export async function loadCompetitionIdForBoard(boardId: number) {
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { competitionId: true },
  });
  return board?.competitionId ?? null;
}

export async function loadCompetitionBaseForEmail(boardId: number) {
  const competitionId = await loadCompetitionIdForBoard(boardId);
  if (!competitionId) return null;

  return db.query.competitions.findFirst({
    where: eq(competitions.id, competitionId),
    columns: {
      id: true,
      name: true,
      city: true,
      startDate: true,
      endDate: true,
      wcaCompetitionUrl: true,
    },
    with: {
      state: { columns: { name: true } },
      delegates: {
        with: {
          delegate: {
            columns: { id: true, name: true, image: true, wcaId: true },
          },
        },
      },
      organizers: {
        with: {
          organizer: {
            columns: { id: true, name: true, image: true, wcaId: true },
          },
        },
      },
    },
  });
}

export type CompetitionTeamFooterPerson = {
  name: string;
  image: string | null;
  role: "organizador" | "delegado";
};

export function teamFooterPeopleFromCompetition(competition: {
  delegates: {
    isPrimary?: boolean;
    delegate: {
      id: string;
      name: string;
      image: string | null;
    } | null;
  }[];
  organizers: {
    organizer: {
      id: string;
      name: string;
      image: string | null;
    } | null;
  }[];
}): CompetitionTeamFooterPerson[] {
  const people: CompetitionTeamFooterPerson[] = [];
  const seen = new Set<string>();

  for (const row of competition.organizers) {
    const organizer = row.organizer;
    if (!organizer?.name.trim()) continue;
    if (seen.has(organizer.id)) continue;
    seen.add(organizer.id);
    people.push({
      name: organizer.name.trim(),
      image: organizer.image,
      role: "organizador",
    });
  }

  const delegates = [...competition.delegates].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
  );
  for (const row of delegates) {
    const delegate = row.delegate;
    if (!delegate?.name.trim()) continue;
    if (seen.has(delegate.id)) continue;
    seen.add(delegate.id);
    people.push({
      name: delegate.name.trim(),
      image: delegate.image,
      role: "delegado",
    });
  }

  return people;
}

export async function loadAuthenticatedWcifForCompetition(input: {
  userId: string;
  wcaCompetitionUrl: string | null;
}): Promise<
  | { ok: true; wcif: AuthenticatedWcif; wcaId: string }
  | { ok: false; message: string }
> {
  const wcaId = wcaCompetitionIdFromUrl(input.wcaCompetitionUrl);
  if (!wcaId) {
    return {
      ok: false,
      message:
        "Guarda la URL de la WCA en la tarjeta Sitio web (WCA) antes de continuar.",
    };
  }

  const token = await getWcaAccessTokenForUser(input.userId);
  if (!token.ok) {
    return { ok: false, message: token.message };
  }

  const wcif = await fetchAuthenticatedWcif(wcaId, token.accessToken);
  if (!wcif.ok) {
    return { ok: false, message: wcif.message };
  }

  return { ok: true, wcif: wcif.wcif, wcaId };
}

export async function loadRecipientsForCompetition(input: {
  userId: string;
  wcaCompetitionUrl: string | null;
}) {
  const loaded = await loadAuthenticatedWcifForCompetition(input);
  if (!loaded.ok) return loaded;

  const recipients = competitorRecipientsFromWcif(loaded.wcif.persons);
  return { ok: true as const, recipients, wcaId: loaded.wcaId };
}

/** Competition logo from the WCA page information (first image), if any. */
export async function loadCompetitionLogoUrl(
  wcaCompetitionUrl: string | null | undefined,
): Promise<string | null> {
  if (!wcaCompetitionUrl?.trim()) return null;
  const wca = await fetchWcaCompetition(wcaCompetitionUrl);
  if (!wca.ok) return null;
  return wca.competition.logoUrl?.trim() || null;
}
