import { and, eq } from "drizzle-orm";

import { db } from "./index";
import {
  type AppUrls,
  competitionNotificationRow,
  competitionTeamUsers,
  formatInternalStatusLabel,
  formatPublicStatusLabel,
  insertNotifications,
} from "./notifications";
import {
  boards,
  competitionDelegates,
  competitionOrganizers,
  competitions,
  dateRequests,
  logs,
  type Competition,
} from "./schema";

export type StatusPair = {
  statusPublic: Competition["statusPublic"];
  statusInternal: Competition["statusInternal"];
};

export type TransitionId =
  | "confirm_venue"
  | "announce"
  | "open_registration"
  | "celebrate"
  | "cancel"
  | "ask_for_help";

export type TransitionEffects = {
  requiresSocialPublish: boolean;
  archiveBoard: boolean;
  notify: boolean;
};

export type TransitionSource = "calendar" | "board_readiness" | "form";

export const DATE_REQUEST_INITIAL: StatusPair = {
  statusPublic: "reserved",
  statusInternal: "looking_for_venue",
};

export const ALLOWED_INITIAL_PAIRS: readonly StatusPair[] = [
  { statusPublic: "reserved", statusInternal: "looking_for_venue" },
  { statusPublic: "reserved", statusInternal: "asked_for_help" },
  { statusPublic: "open", statusInternal: "looking_for_venue" },
  { statusPublic: "confirmed", statusInternal: "venue_found" },
  { statusPublic: "announced", statusInternal: "wca_approved" },
  { statusPublic: "unavailable", statusInternal: "cancelled" },
] as const;

type TransitionTx = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select: (...args: any[]) => any;
};

function pairsEqual(a: StatusPair, b: StatusPair) {
  return (
    a.statusPublic === b.statusPublic && a.statusInternal === b.statusInternal
  );
}

function isCancelled(from: StatusPair) {
  return (
    from.statusPublic === "suspended" || from.statusInternal === "cancelled"
  );
}

function isTerminalCelebrated(from: StatusPair) {
  return from.statusInternal === "celebrated";
}

type TransitionDef = {
  id: TransitionId;
  effects: TransitionEffects;
  resolveTo: (from: StatusPair) => StatusPair;
  canApply: (from: StatusPair) => boolean;
  rejectMessage: string;
};

const TRANSITIONS: Record<TransitionId, TransitionDef> = {
  confirm_venue: {
    id: "confirm_venue",
    effects: {
      requiresSocialPublish: false,
      archiveBoard: false,
      notify: true,
    },
    resolveTo: () => ({
      statusPublic: "confirmed",
      statusInternal: "venue_found",
    }),
    canApply: (from) =>
      !isCancelled(from) &&
      (from.statusPublic === "open" || from.statusPublic === "reserved"),
    rejectMessage:
      "Solo se puede confirmar sede desde fecha abierta o reservada",
  },
  announce: {
    id: "announce",
    effects: {
      requiresSocialPublish: true,
      archiveBoard: false,
      notify: true,
    },
    resolveTo: () => ({
      statusPublic: "announced",
      statusInternal: "wca_approved",
    }),
    canApply: (from) => from.statusPublic !== "announced" && !isCancelled(from),
    rejectMessage: "No se puede anunciar esta competencia",
  },
  open_registration: {
    id: "open_registration",
    effects: {
      requiresSocialPublish: false,
      archiveBoard: false,
      notify: true,
    },
    resolveTo: () => ({
      statusPublic: "announced",
      statusInternal: "registration_open",
    }),
    canApply: (from) =>
      from.statusPublic === "announced" &&
      from.statusInternal !== "registration_open" &&
      from.statusInternal !== "celebrated" &&
      from.statusInternal !== "cancelled",
    rejectMessage:
      "El registro solo se abre en competencias anunciadas activas",
  },
  celebrate: {
    id: "celebrate",
    effects: {
      requiresSocialPublish: false,
      archiveBoard: false,
      notify: true,
    },
    resolveTo: () => ({
      statusPublic: "announced",
      statusInternal: "celebrated",
    }),
    canApply: (from) =>
      from.statusInternal !== "celebrated" &&
      from.statusInternal !== "cancelled" &&
      !isCancelled(from),
    rejectMessage:
      "Solo se puede celebrar una competencia que no esté cancelada",
  },
  cancel: {
    id: "cancel",
    effects: {
      requiresSocialPublish: false,
      archiveBoard: true,
      notify: true,
    },
    resolveTo: () => ({
      statusPublic: "suspended",
      statusInternal: "cancelled",
    }),
    canApply: (from) => !isCancelled(from),
    rejectMessage: "La competencia ya está cancelada",
  },
  ask_for_help: {
    id: "ask_for_help",
    effects: {
      requiresSocialPublish: false,
      archiveBoard: false,
      notify: true,
    },
    resolveTo: (from) => ({
      statusPublic: from.statusPublic,
      statusInternal: "asked_for_help",
    }),
    canApply: (from) =>
      !isCancelled(from) &&
      !isTerminalCelebrated(from) &&
      from.statusInternal !== "asked_for_help",
    rejectMessage: "No se puede solicitar ayuda en este estatus",
  },
};

export function getTransition(id: TransitionId): TransitionDef {
  return TRANSITIONS[id];
}

export function transitionStatusLabel(
  from: StatusPair,
  to: StatusPair,
): string {
  if (from.statusPublic !== to.statusPublic) {
    return formatPublicStatusLabel(to.statusPublic);
  }
  return formatInternalStatusLabel(to.statusInternal);
}

/**
 * Normalize form intent: announcing forces wca_approved; celebrating forces announced.
 */
export function normalizeStatusIntent(to: StatusPair): StatusPair {
  if (to.statusInternal === "celebrated") {
    return { statusPublic: "announced", statusInternal: "celebrated" };
  }
  if (to.statusPublic === "announced") {
    if (to.statusInternal === "registration_open") {
      return to;
    }
    return { statusPublic: "announced", statusInternal: "wca_approved" };
  }
  return to;
}

export function assertCanApply(id: TransitionId, from: StatusPair): void {
  const def = TRANSITIONS[id];
  if (!def.canApply(from)) {
    throw new Error(def.rejectMessage);
  }
}

export function assertInitialStatuses(pair: StatusPair): void {
  const normalized = normalizeStatusIntent(pair);
  const allowed = ALLOWED_INITIAL_PAIRS.some((p) => pairsEqual(p, normalized));
  if (!allowed) {
    throw new Error(
      `Par de estatus inicial no permitido: ${normalized.statusPublic} / ${normalized.statusInternal}`,
    );
  }
}

export type ResolveStatusChangeResult =
  | { noop: true }
  | { id: TransitionId; to: StatusPair; effects: TransitionEffects };

export function resolveStatusChange(
  from: StatusPair,
  toPublic: Competition["statusPublic"],
  toInternal: Competition["statusInternal"],
): ResolveStatusChangeResult {
  const to = normalizeStatusIntent({
    statusPublic: toPublic,
    statusInternal: toInternal,
  });

  if (pairsEqual(from, to)) {
    return { noop: true };
  }

  for (const id of Object.keys(TRANSITIONS) as TransitionId[]) {
    const def = TRANSITIONS[id];
    if (!def.canApply(from)) continue;
    const resolved = def.resolveTo(from);
    if (pairsEqual(resolved, to)) {
      return { id, to: resolved, effects: def.effects };
    }
  }

  throw new Error(
    `Cambio de estatus no permitido: ${from.statusPublic}/${from.statusInternal} → ${to.statusPublic}/${to.statusInternal}`,
  );
}

export type StatusTransitionPatch = {
  wcaCompetitionUrl?: string | null;
  announcedPostedAt?: Date | null;
  facebookPostId?: string | null;
  instagramMediaId?: string | null;
};

export async function applyStatusTransition(
  tx: TransitionTx,
  input: {
    competitionId: number;
    actorId: string;
    transitionId: TransitionId;
    from?: StatusPair;
    patch?: StatusTransitionPatch;
    source?: TransitionSource;
    suggestionKind?: string;
    urls: AppUrls;
    extraLogDetails?: Record<string, unknown>;
  },
): Promise<{
  city: string;
  from: StatusPair;
  to: StatusPair;
  statusLabel: string;
  effects: TransitionEffects;
}> {
  const competition = await tx.query.competitions.findFirst({
    where: eq(competitions.id, input.competitionId),
    columns: {
      city: true,
      statusPublic: true,
      statusInternal: true,
    },
  });

  if (!competition) {
    throw new Error("Competencia no encontrada");
  }

  // Prefer live DB state over any caller snapshot.
  const effectiveFrom: StatusPair = {
    statusPublic: competition.statusPublic,
    statusInternal: competition.statusInternal,
  };

  assertCanApply(input.transitionId, effectiveFrom);
  const def = TRANSITIONS[input.transitionId];
  const to = def.resolveTo(effectiveFrom);

  await tx
    .update(competitions)
    .set({
      statusPublic: to.statusPublic,
      statusInternal: to.statusInternal,
      updatedAt: new Date(),
      ...(input.patch ?? {}),
    })
    .where(eq(competitions.id, input.competitionId));

  if (def.effects.archiveBoard) {
    await tx
      .update(boards)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(boards.competitionId, input.competitionId));
  }

  const statusLabel = transitionStatusLabel(effectiveFrom, to);

  await tx.insert(logs).values({
    action: "update_competition",
    targetType: "competition",
    targetId: String(input.competitionId),
    actorId: input.actorId,
    details: {
      transitionId: input.transitionId,
      statusPublic: to.statusPublic,
      statusInternal: to.statusInternal,
      previousStatusPublic: effectiveFrom.statusPublic,
      previousStatusInternal: effectiveFrom.statusInternal,
      ...(def.effects.archiveBoard ? { boardArchived: true } : {}),
      ...(input.source ? { source: input.source } : {}),
      ...(input.suggestionKind ? { suggestionKind: input.suggestionKind } : {}),
      ...(input.extraLogDetails ?? {}),
    },
  });

  if (def.effects.notify) {
    const team = await competitionTeamUsers(
      tx as typeof db,
      input.competitionId,
    );
    await insertNotifications(
      tx as typeof db,
      team.map((recipient) =>
        competitionNotificationRow({
          recipient,
          actorId: input.actorId,
          type: "competition_status_changed",
          urls: input.urls,
          competitionId: input.competitionId,
          city: competition.city,
          statusLabel,
          statusPublic: to.statusPublic,
          statusInternal: to.statusInternal,
        }),
      ),
    );
  }

  return {
    city: competition.city,
    from: effectiveFrom,
    to,
    statusLabel,
    effects: def.effects,
  };
}

export async function createCompetitionFromDateRequestAccept(
  tx: TransitionTx,
  input: {
    dateRequestId: number;
    actorId: string;
    city: string;
    stateId: string;
    requestedBy: string;
    startDate: string;
    endDate: string;
    delegateWcaId: string;
    capacity?: number;
  },
): Promise<number> {
  const [comp] = await tx
    .insert(competitions)
    .values({
      city: input.city,
      stateId: input.stateId,
      requestedBy: input.requestedBy,
      startDate: input.startDate,
      endDate: input.endDate,
      capacity: input.capacity ?? 50,
      statusPublic: DATE_REQUEST_INITIAL.statusPublic,
      statusInternal: DATE_REQUEST_INITIAL.statusInternal,
    })
    .returning({ id: competitions.id });

  const competitionId = comp!.id;

  await tx.insert(competitionDelegates).values({
    competitionId,
    delegateWcaId: input.delegateWcaId,
    isPrimary: true,
    status: "accepted",
  });

  await tx.insert(competitionOrganizers).values({
    competitionId,
    organizerWcaId: input.requestedBy,
    isPrimary: true,
  });

  await tx.insert(logs).values({
    action: "create_competition",
    targetType: "competition",
    targetId: String(competitionId),
    actorId: input.actorId,
    details: {
      fromDateRequestId: input.dateRequestId,
      city: input.city,
      stateId: input.stateId,
      startDate: input.startDate,
      endDate: input.endDate,
      transitionId: "date_request_accept",
      statusPublic: DATE_REQUEST_INITIAL.statusPublic,
      statusInternal: DATE_REQUEST_INITIAL.statusInternal,
    },
  });

  await tx
    .update(dateRequests)
    .set({
      status: "accepted",
      competitionId,
      updatedAt: new Date(),
    })
    .where(eq(dateRequests.id, input.dateRequestId));

  return competitionId;
}

export async function acceptPendingDelegateAssignment(
  tx: TransitionTx,
  input: {
    competitionId: number;
    delegateWcaId: string;
  },
): Promise<void> {
  const updated = await tx
    .update(competitionDelegates)
    .set({ status: "accepted" })
    .where(
      and(
        eq(competitionDelegates.competitionId, input.competitionId),
        eq(competitionDelegates.delegateWcaId, input.delegateWcaId),
        eq(competitionDelegates.status, "pending"),
      ),
    )
    .returning({ delegateWcaId: competitionDelegates.delegateWcaId });

  if (updated.length === 0) {
    throw new Error("No tienes una propuesta pendiente para esta competencia");
  }
}

export async function declinePendingDelegateAssignment(
  tx: TransitionTx,
  input: {
    competitionId: number;
    delegateWcaId: string;
    nextDelegate?: { wcaId: string } | null;
  },
): Promise<void> {
  const updated = await tx
    .update(competitionDelegates)
    .set({ status: "declined", isPrimary: false })
    .where(
      and(
        eq(competitionDelegates.competitionId, input.competitionId),
        eq(competitionDelegates.delegateWcaId, input.delegateWcaId),
        eq(competitionDelegates.status, "pending"),
      ),
    )
    .returning({ delegateWcaId: competitionDelegates.delegateWcaId });

  if (updated.length === 0) {
    throw new Error("No tienes una propuesta pendiente para esta competencia");
  }

  if (input.nextDelegate) {
    await tx.insert(competitionDelegates).values({
      competitionId: input.competitionId,
      delegateWcaId: input.nextDelegate.wcaId,
      isPrimary: true,
      status: "pending",
    });
  }
}
