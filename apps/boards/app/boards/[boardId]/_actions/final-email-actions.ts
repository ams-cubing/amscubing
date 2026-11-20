"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@workspace/db";
import { FINAL_EMAIL_CARD_TITLE } from "@workspace/db/data/ams-board-template";
import { CHAMPIONSHIP_FINAL_EMAIL_CARD_TITLE } from "@workspace/db/data/ams-championship-template";
import { consumeRateLimit } from "@workspace/db/rate-limit";
import {
  boards,
  competitionDelegates,
  competitionOrganizers,
  competitionSponsors,
  competitions,
  user,
} from "@workspace/db/schema";
import {
  competitionThankYouPlainBody,
  competitionThankYouSubject,
  isDeliverableEmail,
  plainTextEmailBodyToHtml,
  renderEmailLayout,
  sendEmails,
} from "@workspace/email";
import { log } from "@workspace/server/log";

import { canAccessBoard } from "@/lib/boards";
import { requireSessionOrUnauthorized } from "@/lib/session";
import { getWcaAccessTokenForUser } from "@/lib/wca-access-token";
import {
  competitorRecipientsFromWcif,
  fetchAuthenticatedWcif,
  wcaCompetitionIdFromUrl,
} from "@/lib/wca-authenticated-wcif";

import {
  assertCardOnBoard,
  requireBoardAccess,
  resolveSessionUserId,
} from "../_lib/board-access";

const FINAL_EMAIL_TITLES = new Set([
  FINAL_EMAIL_CARD_TITLE,
  CHAMPIONSHIP_FINAL_EMAIL_CARD_TITLE,
]);

const optionalUrl = z
  .string()
  .max(2000)
  .transform((value) => value.trim() || null)
  .refine(
    (value) =>
      value == null ||
      /^https?:\/\//i.test(value) ||
      value.startsWith("/"),
    "Usa un enlace http(s) o una ruta que empiece con /",
  );

type ActionFail = { ok: false; message: string };
type ActionOk<T extends object = object> = {
  ok: true;
  message: string;
} & T;

async function assertFinalEmailCard(boardId: number, cardId: number) {
  const card = await assertCardOnBoard(boardId, cardId);
  if (!FINAL_EMAIL_TITLES.has(card.title.trim())) {
    throw new Error("Esta tarjeta no maneja el correo final");
  }
  return card;
}

async function loadCompetitionForBoard(boardId: number) {
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { competitionId: true },
  });
  if (!board?.competitionId) return null;

  return db.query.competitions.findFirst({
    where: eq(competitions.id, board.competitionId),
    columns: {
      id: true,
      name: true,
      city: true,
      startDate: true,
      endDate: true,
      wcaCompetitionUrl: true,
      finalEmailSubject: true,
      finalEmailBody: true,
      finalEmailSurveyUrl: true,
      finalEmailCertificatesUrl: true,
      finalEmailPhotosUrl: true,
      finalEmailExpenseUrl: true,
      finalEmailSentAt: true,
      finalEmailSentByUserId: true,
      finalEmailRecipientCount: true,
    },
    with: {
      state: { columns: { name: true } },
    },
  });
}

async function assertCompetitionDelegateOrOrganizer(input: {
  competitionId: number;
  userId: string;
  wcaId: string | null;
}): Promise<ActionFail | { ok: true }> {
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
        "Solo delegados u organizadores de la competencia pueden enviar este correo.",
    };
  }
  return { ok: true };
}

function formatCompetitionDateLabel(startDate: string, endDate: string) {
  const format = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: "America/Mexico_City",
  });
  const start = format.format(new Date(`${startDate}T12:00:00`));
  if (startDate === endDate) return start;
  const end = format.format(new Date(`${endDate}T12:00:00`));
  return `${start} – ${end}`;
}

function placeLabel(city: string, stateName: string | null | undefined) {
  const state = stateName?.trim();
  return state ? `${city}, ${state}` : city;
}

function defaultExpenseUrl(boardId: number) {
  return `/boards/${boardId}/costos/resumen`;
}

function absoluteExpenseUrl(boardId: number, expenseUrl: string | null) {
  const raw = expenseUrl?.trim() || defaultExpenseUrl(boardId);
  if (/^https?:\/\//i.test(raw)) return raw;
  const boardsBase =
    process.env.NEXT_PUBLIC_BOARDS_URL?.replace(/\/$/, "") ||
    "http://localhost:3002";
  return `${boardsBase}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function buildSeedDraft(input: {
  boardId: number;
  competition: NonNullable<Awaited<ReturnType<typeof loadCompetitionForBoard>>>;
  sponsorNames: string[];
}) {
  const wcaId =
    wcaCompetitionIdFromUrl(input.competition.wcaCompetitionUrl) ??
    "COMPETENCIA";
  const wcaCompetitionUrl =
    input.competition.wcaCompetitionUrl?.trim() ||
    `https://www.worldcubeassociation.org/competitions/${wcaId}`;
  const wcaLiveUrl = `https://live.worldcubeassociation.org/link/competitions/${wcaId}`;
  const expenseSummaryUrl = absoluteExpenseUrl(
    input.boardId,
    input.competition.finalEmailExpenseUrl,
  );

  const competitionName =
    input.competition.name?.trim() || "la competencia";
  const templateInput = {
    competitionName,
    dateLabel: formatCompetitionDateLabel(
      input.competition.startDate,
      input.competition.endDate,
    ),
    placeLabel: placeLabel(
      input.competition.city,
      input.competition.state?.name,
    ),
    wcaCompetitionUrl,
    wcaLiveUrl,
    sponsorNames: input.sponsorNames,
    surveyUrl: input.competition.finalEmailSurveyUrl,
    certificatesUrl: input.competition.finalEmailCertificatesUrl,
    photosUrl: input.competition.finalEmailPhotosUrl,
    expenseSummaryUrl,
  };

  return {
    subject:
      input.competition.finalEmailSubject?.trim() ||
      competitionThankYouSubject({ competitionName }),
    body:
      input.competition.finalEmailBody?.trim() ||
      competitionThankYouPlainBody(templateInput),
    surveyUrl: input.competition.finalEmailSurveyUrl ?? "",
    certificatesUrl: input.competition.finalEmailCertificatesUrl ?? "",
    photosUrl: input.competition.finalEmailPhotosUrl ?? "",
    expenseUrl:
      input.competition.finalEmailExpenseUrl?.trim() ||
      defaultExpenseUrl(input.boardId),
  };
}

async function loadSponsorNames(competitionId: number) {
  const rows = await db
    .select({ name: competitionSponsors.name })
    .from(competitionSponsors)
    .where(eq(competitionSponsors.competitionId, competitionId))
    .orderBy(asc(competitionSponsors.name));
  return rows.map((row) => row.name);
}

function appendOptionalLinksToBody(
  body: string,
  links: {
    surveyUrl: string | null;
    certificatesUrl: string | null;
    photosUrl: string | null;
    expenseUrl: string | null;
  },
) {
  const sections: string[] = [];
  const pushIfMissing = (url: string | null, title: string, blurb: string) => {
    const trimmed = url?.trim();
    if (!trimmed) return;
    if (body.includes(trimmed)) return;
    sections.push("", title, blurb, trimmed);
  };

  pushIfMissing(
    links.expenseUrl,
    "Resumen de Gastos",
    "Como parte de nuestro compromiso con la transparencia, compartimos un resumen general del uso de la cuota de registro del evento:",
  );
  pushIfMissing(
    links.certificatesUrl,
    "Reconocimientos Digitales",
    "Hemos preparado reconocimientos digitales para los competidores que obtuvieron podio. Puedes descargarlos aquí:",
  );
  pushIfMissing(
    links.photosUrl,
    "Fotografías del Evento",
    "Si deseas revivir algunos momentos de la competencia, puedes consultar la galería aquí:",
  );
  pushIfMissing(
    links.surveyUrl,
    "Encuesta de Calidad",
    "Nos ayuda mucho conocer tu experiencia. Puedes responder la encuesta aquí:",
  );

  if (sections.length === 0) return body;
  return `${body.trimEnd()}\n${sections.join("\n")}`;
}

async function loadRecipientsForCompetition(input: {
  userId: string;
  wcaCompetitionUrl: string | null;
}) {
  const wcaId = wcaCompetitionIdFromUrl(input.wcaCompetitionUrl);
  if (!wcaId) {
    return {
      ok: false as const,
      message:
        "Guarda la URL de la WCA en la tarjeta Sitio web (WCA) antes de enviar el correo.",
    };
  }

  const token = await getWcaAccessTokenForUser(input.userId);
  if (!token.ok) {
    return { ok: false as const, message: token.message };
  }

  const wcif = await fetchAuthenticatedWcif(wcaId, token.accessToken);
  if (!wcif.ok) {
    return { ok: false as const, message: wcif.message };
  }

  const recipients = competitorRecipientsFromWcif(wcif.wcif.persons);
  return { ok: true as const, recipients, wcaId };
}

export type FinalEmailDraftData = {
  subject: string;
  body: string;
  surveyUrl: string;
  certificatesUrl: string;
  photosUrl: string;
  expenseUrl: string;
  sponsorNames: string[];
  sentAt: string | null;
  sentRecipientCount: number | null;
  canSend: boolean;
  wcaCompetitionUrl: string | null;
};

export async function loadFinalEmailCard(input: {
  boardId: number;
  cardId: number;
}): Promise<ActionFail | ActionOk<{ data: FinalEmailDraftData }>> {
  const session = await requireSessionOrUnauthorized();
  if (!(await canAccessBoard(session.user, input.boardId))) {
    return { ok: false, message: "No tienes acceso a este tablero" };
  }
  const userId = await resolveSessionUserId(session.user);
  await assertFinalEmailCard(input.boardId, input.cardId);

  const competition = await loadCompetitionForBoard(input.boardId);
  if (!competition) {
    return {
      ok: false,
      message: "Este tablero no está ligado a una competencia",
    };
  }

  const role = await assertCompetitionDelegateOrOrganizer({
    competitionId: competition.id,
    userId,
    wcaId: session.user.wcaId,
  });
  const canSend = role.ok;
  const sponsorNames = await loadSponsorNames(competition.id);
  const draft = buildSeedDraft({
    boardId: input.boardId,
    competition,
    sponsorNames,
  });

  return {
    ok: true,
    message: "Borrador cargado",
    data: {
      ...draft,
      sponsorNames,
      sentAt: competition.finalEmailSentAt?.toISOString() ?? null,
      sentRecipientCount: competition.finalEmailRecipientCount,
      canSend,
      wcaCompetitionUrl: competition.wcaCompetitionUrl,
    },
  };
}

const draftSchema = z.object({
  boardId: z.number().int().positive(),
  cardId: z.number().int().positive(),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(20000),
  surveyUrl: optionalUrl,
  certificatesUrl: optionalUrl,
  photosUrl: optionalUrl,
  expenseUrl: optionalUrl,
});

export async function saveFinalEmailDraft(
  raw: z.input<typeof draftSchema>,
): Promise<ActionFail | ActionOk> {
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Revisa el asunto, el cuerpo y los enlaces" };
  }
  const input = parsed.data;
  const actor = await requireBoardAccess(input.boardId);
  await assertFinalEmailCard(input.boardId, input.cardId);

  const competition = await loadCompetitionForBoard(input.boardId);
  if (!competition) {
    return {
      ok: false,
      message: "Este tablero no está ligado a una competencia",
    };
  }

  const role = await assertCompetitionDelegateOrOrganizer({
    competitionId: competition.id,
    userId: actor.id,
    wcaId: actor.wcaId,
  });
  if (!role.ok) return role;

  const { allowed } = await consumeRateLimit({
    key: `boards:final-email-draft:user:${actor.id}`,
    windowMs: 10 * 60 * 1000,
    max: 60,
  });
  if (!allowed) {
    return {
      ok: false,
      message: "Espera unos minutos antes de volver a guardar el borrador",
    };
  }

  await db
    .update(competitions)
    .set({
      finalEmailSubject: input.subject,
      finalEmailBody: input.body,
      finalEmailSurveyUrl: input.surveyUrl,
      finalEmailCertificatesUrl: input.certificatesUrl,
      finalEmailPhotosUrl: input.photosUrl,
      finalEmailExpenseUrl: input.expenseUrl,
      updatedAt: new Date(),
    })
    .where(eq(competitions.id, competition.id));

  revalidatePath(`/boards/${input.boardId}`);
  return { ok: true, message: "Borrador guardado" };
}

export async function previewFinalEmailRecipients(input: {
  boardId: number;
  cardId: number;
}): Promise<
  ActionFail | ActionOk<{ count: number; sampleNames: string[] }>
> {
  const actor = await requireBoardAccess(input.boardId);
  await assertFinalEmailCard(input.boardId, input.cardId);

  const competition = await loadCompetitionForBoard(input.boardId);
  if (!competition) {
    return {
      ok: false,
      message: "Este tablero no está ligado a una competencia",
    };
  }

  const role = await assertCompetitionDelegateOrOrganizer({
    competitionId: competition.id,
    userId: actor.id,
    wcaId: actor.wcaId,
  });
  if (!role.ok) return role;

  const { allowed } = await consumeRateLimit({
    key: `boards:final-email-preview:user:${actor.id}`,
    windowMs: 10 * 60 * 1000,
    max: 30,
  });
  if (!allowed) {
    return {
      ok: false,
      message: "Espera unos minutos antes de volver a consultar destinatarios",
    };
  }

  const loaded = await loadRecipientsForCompetition({
    userId: actor.id,
    wcaCompetitionUrl: competition.wcaCompetitionUrl,
  });
  if (!loaded.ok) return loaded;

  return {
    ok: true,
    message: `Se encontraron ${loaded.recipients.length} destinatarios`,
    count: loaded.recipients.length,
    sampleNames: loaded.recipients.slice(0, 5).map((row) => row.name),
  };
}

const sendSchema = z.object({
  boardId: z.number().int().positive(),
  cardId: z.number().int().positive(),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(20000),
  surveyUrl: optionalUrl,
  certificatesUrl: optionalUrl,
  photosUrl: optionalUrl,
  expenseUrl: optionalUrl,
  confirmResend: z.boolean().optional(),
});

export async function sendFinalEmail(
  raw: z.input<typeof sendSchema>,
): Promise<ActionFail | ActionOk<{ recipientCount: number }>> {
  const parsed = sendSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Revisa el asunto, el cuerpo y los enlaces" };
  }
  const input = parsed.data;
  const actor = await requireBoardAccess(input.boardId);
  await assertFinalEmailCard(input.boardId, input.cardId);

  const competition = await loadCompetitionForBoard(input.boardId);
  if (!competition) {
    return {
      ok: false,
      message: "Este tablero no está ligado a una competencia",
    };
  }

  const role = await assertCompetitionDelegateOrOrganizer({
    competitionId: competition.id,
    userId: actor.id,
    wcaId: actor.wcaId,
  });
  if (!role.ok) return role;

  if (competition.finalEmailSentAt && !input.confirmResend) {
    return {
      ok: false,
      message:
        "Este correo ya se envió. Confirma el reenvío si quieres mandarlo otra vez.",
    };
  }

  const [userLimit, competitionLimit] = await Promise.all([
    consumeRateLimit({
      key: `boards:final-email:user:${actor.id}`,
      windowMs: 60 * 60 * 1000,
      max: 5,
    }),
    consumeRateLimit({
      key: `boards:final-email:competition:${competition.id}`,
      windowMs: 24 * 60 * 60 * 1000,
      max: 3,
    }),
  ]);
  if (!userLimit.allowed || !competitionLimit.allowed) {
    return {
      ok: false,
      message: "Límite de envíos alcanzado. Inténtalo más tarde.",
    };
  }

  const loaded = await loadRecipientsForCompetition({
    userId: actor.id,
    wcaCompetitionUrl: competition.wcaCompetitionUrl,
  });
  if (!loaded.ok) return loaded;
  if (loaded.recipients.length === 0) {
    return {
      ok: false,
      message:
        "No hay competidores aceptados con correo en el WCIF de esta competencia.",
    };
  }

  const sender = await db.query.user.findFirst({
    where: eq(user.id, actor.id),
    columns: { email: true, name: true },
  });
  const replyTo =
    sender && isDeliverableEmail(sender.email) ? sender.email : undefined;

  const bodyWithOptionalLinks = appendOptionalLinksToBody(input.body, {
    surveyUrl: input.surveyUrl,
    certificatesUrl: input.certificatesUrl,
    photosUrl: input.photosUrl,
    expenseUrl: absoluteExpenseUrl(input.boardId, input.expenseUrl),
  });

  // Persist the draft used for this send before mailing.
  await db
    .update(competitions)
    .set({
      finalEmailSubject: input.subject,
      finalEmailBody: input.body,
      finalEmailSurveyUrl: input.surveyUrl,
      finalEmailCertificatesUrl: input.certificatesUrl,
      finalEmailPhotosUrl: input.photosUrl,
      finalEmailExpenseUrl: input.expenseUrl,
      updatedAt: new Date(),
    })
    .where(eq(competitions.id, competition.id));

  const html = renderEmailLayout({
    previewText: input.subject,
    title: input.subject,
    bodyHtml: plainTextEmailBodyToHtml(bodyWithOptionalLinks),
  });
  const batch = loaded.recipients.map((recipient) => ({
    to: recipient.email,
    subject: input.subject,
    html,
    replyTo,
  }));

  const sent = await sendEmails(batch);
  if (!sent.ok) {
    log.error("boards.final_email_send_failed", {
      competitionId: competition.id,
      userId: actor.id,
      attempted: loaded.recipients.length,
      sent: sent.sent,
    });
    return {
      ok: false,
      message:
        sent.sent > 0
          ? `El envío falló a mitad de camino (${sent.sent} enviados). Revisa Resend e inténtalo de nuevo.`
          : "No se pudo enviar el correo. Verifica RESEND_API_KEY e inténtalo de nuevo.",
    };
  }

  await db
    .update(competitions)
    .set({
      finalEmailSentAt: new Date(),
      finalEmailSentByUserId: actor.id,
      finalEmailRecipientCount: sent.sent,
      updatedAt: new Date(),
    })
    .where(eq(competitions.id, competition.id));

  log.info("boards.final_email_sent", {
    competitionId: competition.id,
    userId: actor.id,
    recipientCount: sent.sent,
    wcaId: loaded.wcaId,
  });

  revalidatePath(`/boards/${input.boardId}`);
  return {
    ok: true,
    message: `Correo enviado a ${sent.sent} competidores`,
    recipientCount: sent.sent,
  };
}
