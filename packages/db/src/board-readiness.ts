import { eq } from "drizzle-orm";

import {
  APPROVED_LIST_TITLE,
  VENUE_PERMISSION_CARD_TITLE,
  cardPhase,
  isListTitle,
} from "./board-readiness-labels";
import { getTransition, type TransitionId } from "./competition-transitions";
import { db } from "./index";
import { boardLists, boards, competitions } from "./schema";

export {
  APPROVED_LIST_TITLE,
  HECHO_LIST_TITLE,
  RESOURCES_LIST_TITLE,
  VENUE_PERMISSION_CARD_TITLE,
  cardPhase,
  isListTitle,
  normalizeListTitle,
} from "./board-readiness-labels";

type PhaseKey =
  | "pre_announce"
  | "post_announce"
  | "post_celebrate"
  | "resources";

type BoardCardRow = {
  id: number;
  title: string;
  listTitle: string;
  labelColors: string[];
};

function cardsForPhase(rows: BoardCardRow[], phase: PhaseKey) {
  return rows.filter((row) => cardPhase(row.labelColors) === phase);
}

function allInApprovedList(phaseCards: BoardCardRow[]) {
  if (phaseCards.length === 0) return true;
  return phaseCards.every((card) =>
    isListTitle(card.listTitle, APPROVED_LIST_TITLE),
  );
}

function missingFromApproved(phaseCards: BoardCardRow[]) {
  return phaseCards
    .filter((card) => !isListTitle(card.listTitle, APPROVED_LIST_TITLE))
    .map((card) => ({ title: card.title, currentList: card.listTitle }));
}

export type ReadinessSuggestionKind =
  | "confirm_venue"
  | "announce_ready"
  | "registration_open"
  | "celebrated";

export type ReadinessSuggestion = {
  kind: ReadinessSuggestionKind;
  kindLabel: "apply_status" | "announce_ready";
  label: string;
  description: string;
  /** Named transition to apply when kindLabel is apply_status */
  transitionId?: TransitionId;
  /** Derived from transitionId; kept for notification payload compatibility */
  targetStatusPublic?: string;
  /** Derived from transitionId; kept for notification payload compatibility */
  targetStatusInternal?: string;
  missingCards: { title: string; currentList: string }[];
  progress: { approved: number; total: number };
  readyToApply: boolean;
};

export type BoardReadinessResult = {
  competitionId: number;
  city: string;
  statusPublic: string;
  statusInternal: string;
  suggestion: ReadinessSuggestion | null;
  progressByPhase: {
    preAnnounce: { approved: number; total: number };
    postAnnounce: { approved: number; total: number };
    postCelebrate: { approved: number; total: number };
  };
};

async function loadBoardCards(boardId: number): Promise<BoardCardRow[]> {
  const lists = await db.query.boardLists.findMany({
    where: eq(boardLists.boardId, boardId),
    columns: { id: true, title: true },
    with: {
      cards: {
        columns: { id: true, title: true },
        with: {
          cardLabels: {
            with: { label: { columns: { color: true } } },
          },
        },
      },
    },
  });

  const rows: BoardCardRow[] = [];
  for (const list of lists) {
    for (const card of list.cards) {
      rows.push({
        id: card.id,
        title: card.title,
        listTitle: list.title,
        labelColors: card.cardLabels.map((cl) => cl.label.color.toLowerCase()),
      });
    }
  }
  return rows;
}

function phaseProgress(phaseCards: BoardCardRow[]) {
  const approved = phaseCards.filter((card) =>
    isListTitle(card.listTitle, APPROVED_LIST_TITLE),
  ).length;
  return { approved, total: phaseCards.length };
}

function targetsFromTransition(transitionId: TransitionId) {
  // ask_for_help needs from-state; readiness never uses it.
  const to = getTransition(transitionId).resolveTo({
    statusPublic: "announced",
    statusInternal: "wca_approved",
  });
  return { public: to.statusPublic, internal: to.statusInternal };
}

function buildSuggestion(
  kind: ReadinessSuggestionKind,
  phaseCards: BoardCardRow[],
  label: string,
  description: string,
  kindLabel: ReadinessSuggestion["kindLabel"],
  readyToApply: boolean,
  transitionId?: TransitionId,
): ReadinessSuggestion {
  const targets = transitionId
    ? targetsFromTransition(transitionId)
    : undefined;
  return {
    kind,
    kindLabel,
    label,
    description,
    transitionId,
    targetStatusPublic: targets?.public,
    targetStatusInternal: targets?.internal,
    missingCards: missingFromApproved(phaseCards),
    progress: phaseProgress(phaseCards),
    readyToApply,
  };
}

export async function evaluateBoardReadiness(
  boardId: number,
): Promise<BoardReadinessResult | null> {
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { competitionId: true },
  });
  if (!board?.competitionId) return null;

  const competition = await db.query.competitions.findFirst({
    where: eq(competitions.id, board.competitionId),
    columns: {
      id: true,
      city: true,
      statusPublic: true,
      statusInternal: true,
    },
  });
  if (!competition) return null;

  const cardRows = await loadBoardCards(boardId);
  const preAnnounce = cardsForPhase(cardRows, "pre_announce");
  const postAnnounce = cardsForPhase(cardRows, "post_announce");
  const postCelebrate = cardsForPhase(cardRows, "post_celebrate");

  const progressByPhase = {
    preAnnounce: phaseProgress(preAnnounce),
    postAnnounce: phaseProgress(postAnnounce),
    postCelebrate: phaseProgress(postCelebrate),
  };

  const { statusPublic, statusInternal } = competition;
  let suggestion: ReadinessSuggestion | null = null;

  const preAnnounceReady = allInApprovedList(preAnnounce);
  const postAnnounceReady = allInApprovedList(postAnnounce);
  const postCelebrateReady = allInApprovedList(postCelebrate);

  // Venue confirmation keys off Permiso de sede only (semáforo «Sede confirmada»).
  const venueCards = cardRows.filter((row) =>
    isListTitle(row.title, VENUE_PERMISSION_CARD_TITLE),
  );
  const venueReady = venueCards.length > 0 && allInApprovedList(venueCards);

  if (statusPublic === "open" || statusPublic === "reserved") {
    if (venueReady) {
      suggestion = buildSuggestion(
        "confirm_venue",
        venueCards,
        "Sede confirmada",
        "La tarjeta Permiso de sede está aprobada. Puedes marcar la sede como confirmada.",
        "apply_status",
        true,
        "confirm_venue",
      );
    } else if (venueCards.length > 0) {
      suggestion = buildSuggestion(
        "confirm_venue",
        venueCards,
        "Permiso de sede pendiente",
        "Aprueba la tarjeta Permiso de sede para confirmar la sede.",
        "apply_status",
        false,
        "confirm_venue",
      );
    }
  } else if (statusPublic === "confirmed" && preAnnounce.length > 0) {
    suggestion = buildSuggestion(
      "announce_ready",
      preAnnounce,
      preAnnounceReady ? "Lista para anunciar" : "Pre-anuncio en progreso",
      preAnnounceReady
        ? "Todas las tarjetas de pre-anuncio están aprobadas. La competencia está lista para anunciarse en el calendario."
        : "Completa y aprueba las tarjetas de pre-anuncio para anunciar la competencia.",
      "announce_ready",
      preAnnounceReady,
    );
  } else if (
    statusPublic === "announced" &&
    statusInternal !== "registration_open" &&
    statusInternal !== "celebrated" &&
    statusInternal !== "cancelled" &&
    postAnnounceReady &&
    postAnnounce.length > 0
  ) {
    suggestion = buildSuggestion(
      "registration_open",
      postAnnounce,
      "Registro abierto",
      "Todas las tarjetas de post-anuncio están aprobadas. Puedes marcar el registro como abierto.",
      "apply_status",
      true,
      "open_registration",
    );
  } else if (
    statusInternal !== "celebrated" &&
    statusInternal !== "cancelled" &&
    postCelebrateReady &&
    postCelebrate.length > 0
  ) {
    suggestion = buildSuggestion(
      "celebrated",
      postCelebrate,
      "Celebrado",
      "Todas las tarjetas de post-celebración están aprobadas. Puedes marcar la competencia como celebrada.",
      "apply_status",
      true,
      "celebrate",
    );
  } else if (
    postAnnounce.length > 0 &&
    !postAnnounceReady &&
    statusPublic === "announced"
  ) {
    suggestion = buildSuggestion(
      "registration_open",
      postAnnounce,
      "Post-anuncio en progreso",
      "Completa y aprueba las tarjetas de post-anuncio.",
      "apply_status",
      false,
      "open_registration",
    );
  } else if (postCelebrate.length > 0 && !postCelebrateReady) {
    suggestion = buildSuggestion(
      "celebrated",
      postCelebrate,
      "Post-celebración en progreso",
      "Completa y aprueba las tarjetas de post-celebración.",
      "apply_status",
      false,
      "celebrate",
    );
  }

  return {
    competitionId: competition.id,
    city: competition.city,
    statusPublic,
    statusInternal,
    suggestion,
    progressByPhase,
  };
}

export function isSuggestionApplicable(suggestion: ReadinessSuggestion) {
  return suggestion.readyToApply && suggestion.missingCards.length === 0;
}
