import { and, eq } from "drizzle-orm";

import { db } from "./index";
import { TEMPLATE_LISTS } from "./data/ams-board-template";
import { boardLists, boards, competitions } from "./schema";

export const APPROVED_LIST_TITLE = TEMPLATE_LISTS[3]; // Aprobado
export const HECHO_LIST_TITLE = TEMPLATE_LISTS[2]; // Hecho

export function normalizeListTitle(title: string) {
  return title.trim().toLowerCase();
}

export function isListTitle(title: string, expected: string) {
  return normalizeListTitle(title) === normalizeListTitle(expected);
}

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

function cardPhase(labelColors: string[]): PhaseKey | null {
  if (labelColors.length === 0) return "pre_announce";

  const isPink = labelColors.some(
    (c) => c.includes("ec4899") || c === "#ec4899",
  );
  if (isPink) return "resources";

  const isBlue = labelColors.some(
    (c) => c.includes("3b82f6") || c === "#3b82f6",
  );
  if (isBlue) return "post_celebrate";

  const isRed = labelColors.some(
    (c) => c.includes("ef4444") || c === "#ef4444",
  );
  if (isRed) return "post_announce";

  const isGreen = labelColors.some(
    (c) => c.includes("22c55e") || c === "#22c55e",
  );
  if (isGreen) return "pre_announce";

  const isYellow = labelColors.some(
    (c) => c.includes("eab308") || c === "#eab308",
  );
  if (isYellow) return "pre_announce";

  return "pre_announce";
}

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
  targetStatusPublic?: string;
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

function buildSuggestion(
  kind: ReadinessSuggestionKind,
  phaseCards: BoardCardRow[],
  label: string,
  description: string,
  kindLabel: ReadinessSuggestion["kindLabel"],
  readyToApply: boolean,
  targets?: { public: string; internal: string },
): ReadinessSuggestion {
  return {
    kind,
    kindLabel,
    label,
    description,
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

  if (
    (statusPublic === "open" || statusPublic === "reserved") &&
    preAnnounceReady &&
    preAnnounce.length > 0
  ) {
    suggestion = buildSuggestion(
      "confirm_venue",
      preAnnounce,
      "Sede confirmada",
      "Todas las tarjetas de pre-anuncio están aprobadas. Puedes marcar la sede como confirmada.",
      "apply_status",
      true,
      { public: "confirmed", internal: "venue_found" },
    );
  } else if (
    statusPublic === "confirmed" &&
    preAnnounceReady &&
    preAnnounce.length > 0
  ) {
    suggestion = buildSuggestion(
      "announce_ready",
      preAnnounce,
      "Lista para anunciar",
      "Todas las tarjetas de pre-anuncio están aprobadas. La competencia está lista para anunciarse en el calendario.",
      "announce_ready",
      true,
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
      { public: "announced", internal: "registration_open" },
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
      { public: "announced", internal: "celebrated" },
    );
  } else if (preAnnounce.length > 0 && !preAnnounceReady) {
    suggestion = buildSuggestion(
      "confirm_venue",
      preAnnounce,
      "Pre-anuncio en progreso",
      "Completa y aprueba las tarjetas de pre-anuncio para confirmar la sede.",
      "apply_status",
      false,
      { public: "confirmed", internal: "venue_found" },
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
      { public: "announced", internal: "registration_open" },
    );
  } else if (postCelebrate.length > 0 && !postCelebrateReady) {
    suggestion = buildSuggestion(
      "celebrated",
      postCelebrate,
      "Post-celebración en progreso",
      "Completa y aprueba las tarjetas de post-celebración.",
      "apply_status",
      false,
      { public: "announced", internal: "celebrated" },
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
