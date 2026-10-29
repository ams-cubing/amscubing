/** Maps a Trello board JSON export to AMS board rows. No database access. */

export type TrelloExport = {
  name: string;
  lists: { id: string; name: string; closed: boolean; pos: number }[];
  labels: { id: string; name: string; color: string | null }[];
  cards: {
    id: string;
    name: string;
    desc: string;
    closed: boolean;
    idList: string;
    pos: number;
    due: string | null;
    idLabels: string[];
    idMembers: string[];
    shortUrl: string;
    attachments: { name: string; url: string; isUpload: boolean }[];
  }[];
  checklists: {
    id: string;
    idCard: string;
    name: string;
    pos: number;
    checkItems: { name: string; pos: number; state: string }[];
  }[];
  members: { id: string; fullName: string; username: string }[];
  actions: {
    type: string;
    date: string;
    idMemberCreator: string;
    data: { text?: string; card?: { id: string } };
  }[];
};

export type ImportUser = {
  id: string;
  name: string;
  wcaId: string | null;
};

const FALLBACK_LABEL_COLOR = "#94a3b8";

/** Trello color names to the closest swatch of the boards label palette. */
const TRELLO_LABEL_COLORS: Record<string, string> = {
  green_dark: "#216e4e",
  green: "#4bce97",
  green_light: "#baf3db",
  lime_dark: "#5b7f24",
  lime: "#94c748",
  lime_light: "#d3f1a7",
  yellow_dark: "#974f0c",
  yellow: "#f5a623",
  yellow_light: "#ffe2bd",
  orange_dark: "#974f0c",
  orange: "#fea362",
  orange_light: "#fec195",
  red_dark: "#cf1322",
  red: "#f87168",
  red_light: "#fea191",
  purple_dark: "#5e4db2",
  purple: "#9f8fef",
  purple_light: "#c1b6f2",
  blue_dark: "#0055cc",
  blue: "#579dff",
  blue_light: "#b3d4ff",
  sky_dark: "#0055cc",
  sky: "#85b8ff",
  sky_light: "#cce0ff",
};

export function trelloLabelColor(color: string | null) {
  return (color && TRELLO_LABEL_COLORS[color]) ?? FALLBACK_LABEL_COLOR;
}

/** Butler reminders posted on every card near its due date. */
const AUTOMATED_COMMENT = /^@card esta tarea llegará a su fecha límite/i;

function nameTokens(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Matches each Trello member to the only user whose name contains every word
 * of the Trello full name ("Carlos Chin" → "Carlos Ricardo Chin Dzul").
 * Single-word names ("Aru") are too ambiguous and stay unmatched.
 */
export function matchTrelloMembersByName(
  members: TrelloExport["members"],
  users: ImportUser[],
) {
  const matched = new Map<string, ImportUser>();
  for (const member of members) {
    const wanted = nameTokens(member.fullName);
    if (wanted.length < 2) continue;
    const candidates = users.filter((user) => {
      const have = new Set(nameTokens(user.name));
      return wanted.every((token) => have.has(token));
    });
    if (candidates.length === 1) matched.set(member.id, candidates[0]!);
  }
  return matched;
}

export function dateFromTrelloId(id: string) {
  return new Date(parseInt(id.slice(0, 8), 16) * 1000);
}

/** Rewrites Trello @username mentions to @WCAID so they resolve on the board. */
export function convertTrelloComment(
  text: string,
  usernames: Map<string, ImportUser>,
) {
  return text
    .replace(/@card\b\s*/gi, "")
    .replace(/@board\b/gi, "@todos")
    .replace(/@([a-z0-9_]+)/gi, (mention, username: string) => {
      const user = usernames.get(username.toLowerCase());
      return user?.wcaId ? `@${user.wcaId}` : mention;
    })
    .trim();
}

export type PlannedCard = {
  listIndex: number;
  title: string;
  description: string | null;
  dueDate: Date | null;
  createdAt: Date;
  labelIndexes: number[];
  memberUserIds: string[];
  checklists: { title: string; items: { title: string; done: boolean }[] }[];
  attachments: { name: string; url: string }[];
  comments: { authorUserId: string | null; body: string; createdAt: Date }[];
};

export type TrelloImportPlan = {
  lists: string[];
  labels: { name: string; color: string }[];
  cards: PlannedCard[];
  skipped: {
    closedCards: number;
    automatedComments: number;
    unnamedLabels: number;
  };
};

const byPos = <T extends { pos: number }>(a: T, b: T) => a.pos - b.pos;

/**
 * Open lists and cards only (Trello's archived ones are left out). Uploaded
 * Trello files need a Trello login, so they become links to the original card.
 * Comments by people without an account keep their name in the body and are
 * stored under the importing user (`authorUserId: null`).
 */
export function planTrelloImport(
  trello: TrelloExport,
  matched: Map<string, ImportUser>,
): TrelloImportPlan {
  const lists = trello.lists.filter((list) => !list.closed).sort(byPos);
  const listIndex = new Map(lists.map((list, index) => [list.id, index]));

  const namedLabels = trello.labels.filter((label) => label.name.trim());
  const labelIndex = new Map(namedLabels.map((label, i) => [label.id, i]));

  const membersById = new Map(trello.members.map((m) => [m.id, m]));
  const usernames = new Map<string, ImportUser>();
  for (const member of trello.members) {
    const user = matched.get(member.id);
    if (user) usernames.set(member.username.toLowerCase(), user);
  }

  const openCards = trello.cards.filter(
    (card) => !card.closed && listIndex.has(card.idList),
  );
  const openCardIds = new Set(openCards.map((card) => card.id));

  let automatedComments = 0;
  const commentsByCard = new Map<string, PlannedCard["comments"]>();
  for (const action of trello.actions) {
    const cardId = action.data.card?.id;
    const text = action.data.text;
    if (action.type !== "commentCard" || !cardId || !text) continue;
    if (!openCardIds.has(cardId)) continue;
    if (AUTOMATED_COMMENT.test(text)) {
      automatedComments++;
      continue;
    }

    const author = matched.get(action.idMemberCreator);
    const authorName =
      membersById.get(action.idMemberCreator)?.fullName ?? "Alguien";
    const converted = convertTrelloComment(text, usernames);
    if (!converted) continue;

    const comments = commentsByCard.get(cardId) ?? [];
    comments.push({
      authorUserId: author?.id ?? null,
      body: author ? converted : `**${authorName}** (Trello): ${converted}`,
      createdAt: new Date(action.date),
    });
    commentsByCard.set(cardId, comments);
  }

  const cards = openCards
    .sort(
      (a, b) =>
        listIndex.get(a.idList)! - listIndex.get(b.idList)! || a.pos - b.pos,
    )
    .map((card): PlannedCard => {
      const unmatchedNames = card.idMembers
        .filter((id) => !matched.has(id))
        .map((id) => membersById.get(id)?.fullName)
        .filter((name): name is string => Boolean(name));
      const description = [
        card.desc.trim(),
        unmatchedNames.length
          ? `Responsables en Trello sin cuenta AMS: ${unmatchedNames.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      return {
        listIndex: listIndex.get(card.idList)!,
        title: card.name.trim(),
        description: description || null,
        dueDate: card.due ? new Date(card.due) : null,
        createdAt: dateFromTrelloId(card.id),
        labelIndexes: card.idLabels
          .map((id) => labelIndex.get(id))
          .filter((index): index is number => index !== undefined),
        memberUserIds: [
          ...new Set(
            card.idMembers
              .map((id) => matched.get(id)?.id)
              .filter((id): id is string => Boolean(id)),
          ),
        ],
        checklists: trello.checklists
          .filter((checklist) => checklist.idCard === card.id)
          .sort(byPos)
          .map((checklist) => ({
            title: checklist.name.trim() || "Checklist",
            items: [...checklist.checkItems].sort(byPos).map((item) => ({
              title: item.name.trim(),
              done: item.state === "complete",
            })),
          })),
        attachments: card.attachments.map((attachment) =>
          attachment.isUpload
            ? { name: `${attachment.name} (en Trello)`, url: card.shortUrl }
            : { name: attachment.name, url: attachment.url },
        ),
        comments: (commentsByCard.get(card.id) ?? []).sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        ),
      };
    });

  return {
    lists: lists.map((list) => list.name.trim()),
    labels: namedLabels.map((label) => ({
      name: label.name.trim(),
      color: trelloLabelColor(label.color),
    })),
    cards,
    skipped: {
      closedCards: trello.cards.length - openCards.length,
      automatedComments,
      unnamedLabels: trello.labels.length - namedLabels.length,
    },
  };
}
