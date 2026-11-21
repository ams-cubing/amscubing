"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@workspace/db";
import { INFORMATIVE_EMAIL_CARD_TITLE } from "@workspace/db/data/ams-board-template";
import { CHAMPIONSHIP_INFORMATIVE_EMAIL_CARD_TITLE } from "@workspace/db/data/ams-championship-template";
import { consumeRateLimit } from "@workspace/db/rate-limit";
import { boards, competitions, user } from "@workspace/db/schema";
import {
  competitionGroupsUrl,
  competitionIlrUrl,
  competitionInformativeMarkdownBody,
  competitionInformativeSubject,
  competitionScheduleUrl,
  competitionTeamEmailFooterHtml,
  isDeliverableEmail,
  markdownEmailBodyToHtml,
  renderEmailLayout,
  sendEmails,
} from "@workspace/email";
import { log } from "@workspace/server/log";

import { canAccessBoard } from "@/lib/boards";
import { requireSessionOrUnauthorized } from "@/lib/session";
import { loadInformativeEmailWcaDefaults } from "@/lib/wca-informative-defaults";
import { wcaCompetitionIdFromUrl } from "@/lib/wca-authenticated-wcif";

import {
  assertCardOnBoard,
  requireBoardAccess,
  resolveSessionUserId,
} from "../_lib/board-access";
import {
  assertCompetitionDelegateOrOrganizer,
  formatCompetitionDateLabel,
  loadCompetitionLogoUrl,
  loadRecipientsForCompetition,
  placeLabel,
  teamFooterPeopleFromCompetition,
} from "../_lib/competitor-email";

const INFORMATIVE_EMAIL_TITLES = new Set([
  INFORMATIVE_EMAIL_CARD_TITLE,
  CHAMPIONSHIP_INFORMATIVE_EMAIL_CARD_TITLE,
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

const optionalText = z
  .string()
  .max(4000)
  .transform((value) => value.trim() || null);

type ActionFail = { ok: false; message: string };
type ActionOk<T extends object = object> = {
  ok: true;
  message: string;
} & T;

async function assertInformativeEmailCard(boardId: number, cardId: number) {
  const card = await assertCardOnBoard(boardId, cardId);
  if (!INFORMATIVE_EMAIL_TITLES.has(card.title.trim())) {
    throw new Error("Esta tarjeta no maneja el correo informativo");
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
      informativeEmailSubject: true,
      informativeEmailBody: true,
      informativeEmailUpdateNote: true,
      informativeEmailCheckIn: true,
      informativeEmailTutorialTime: true,
      informativeEmailScheduleUrl: true,
      informativeEmailAddress: true,
      informativeEmailMapsUrl: true,
      informativeEmailParking: true,
      informativeEmailUnofficialEvents: true,
      informativeEmailGroupsUrl: true,
      informativeEmailThanks: true,
      informativeEmailSentAt: true,
      informativeEmailRecipientCount: true,
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

function resolvedGroupsUrl(wcaCompetitionUrl: string | null | undefined) {
  const wcaId = wcaCompetitionIdFromUrl(wcaCompetitionUrl);
  return wcaId ? competitionGroupsUrl(wcaId) : "";
}

function resolvedScheduleUrl(wcaCompetitionUrl: string | null | undefined) {
  const wcaId = wcaCompetitionIdFromUrl(wcaCompetitionUrl);
  return wcaId ? competitionScheduleUrl(wcaId) : "";
}

async function buildSeedDraft(competition: NonNullable<
  Awaited<ReturnType<typeof loadCompetitionForBoard>>
>) {
  const wcaId =
    wcaCompetitionIdFromUrl(competition.wcaCompetitionUrl) ?? "COMPETENCIA";
  const wcaCompetitionUrl =
    competition.wcaCompetitionUrl?.trim() ||
    `https://www.worldcubeassociation.org/competitions/${wcaId}`;
  const competitionName = competition.name?.trim() || "la competencia";
  const wcaDefaults = await loadInformativeEmailWcaDefaults(
    competition.wcaCompetitionUrl,
  );

  const fields = {
    updateNote: competition.informativeEmailUpdateNote ?? "",
    // Auto from public WCIF / WCA (not editable in the form).
    checkIn: wcaDefaults.checkIn || competition.informativeEmailCheckIn || "",
    tutorialTime:
      wcaDefaults.tutorialTime ||
      competition.informativeEmailTutorialTime ||
      "",
    scheduleUrl: competitionScheduleUrl(wcaId),
    address: wcaDefaults.address || competition.informativeEmailAddress || "",
    scheduleOverview: wcaDefaults.scheduleOverview || "",
    mapsUrl: competition.informativeEmailMapsUrl ?? "",
    parking: competition.informativeEmailParking ?? "",
    unofficialEvents: competition.informativeEmailUnofficialEvents ?? "",
    groupsUrl: competitionGroupsUrl(wcaId),
    thanks: competition.informativeEmailThanks ?? "",
  };

  const templateInput = {
    competitionName,
    dateLabel: formatCompetitionDateLabel(
      competition.startDate,
      competition.endDate,
    ),
    placeLabel: placeLabel(competition.city, competition.state?.name),
    wcaCompetitionUrl,
    ilrUrl: competitionIlrUrl(wcaId),
    scheduleUrl: fields.scheduleUrl,
    groupsUrl: fields.groupsUrl,
    updateNote: fields.updateNote || null,
    checkIn: fields.checkIn || null,
    tutorialTime: fields.tutorialTime || null,
    scheduleOverview: wcaDefaults.scheduleOverview || null,
    address: fields.address || null,
    mapsUrl: fields.mapsUrl || null,
    parking: fields.parking || null,
    unofficialEvents: fields.unofficialEvents || null,
    thanks: fields.thanks || null,
  };

  return {
    subject:
      competition.informativeEmailSubject?.trim() ||
      competitionInformativeSubject({ competitionName }),
    body:
      competition.informativeEmailBody?.trim() ||
      competitionInformativeMarkdownBody(templateInput),
    ...fields,
  };
}

function appendOptionalFieldsToBody(
  body: string,
  fields: {
    updateNote: string | null;
    checkIn: string | null;
    tutorialTime: string | null;
    scheduleOverview: string | null;
    scheduleUrl: string | null;
    address: string | null;
    mapsUrl: string | null;
    parking: string | null;
    unofficialEvents: string | null;
    groupsUrl: string | null;
    thanks: string | null;
  },
) {
  const sections: string[] = [];
  const pushSection = (title: string, content: string | null) => {
    const trimmed = content?.trim();
    if (!trimmed) return;
    if (body.includes(trimmed)) return;
    sections.push("", `## ${title}`, "", trimmed);
  };

  pushSection("Actualización importante", fields.updateNote);
  if (
    (fields.checkIn?.trim() && !body.includes(fields.checkIn.trim())) ||
    (fields.tutorialTime?.trim() &&
      !body.includes(fields.tutorialTime.trim())) ||
    (fields.scheduleOverview?.trim() &&
      !body.includes(fields.scheduleOverview.trim()))
  ) {
    const bits = [
      fields.checkIn?.trim() && !body.includes(fields.checkIn.trim())
        ? `**Check-in:** ${fields.checkIn.trim()}`
        : null,
      fields.tutorialTime?.trim() &&
      !body.includes(fields.tutorialTime.trim())
        ? `**Tutorial para nuevos competidores:** ${fields.tutorialTime.trim()}`
        : null,
      fields.scheduleOverview?.trim() &&
      !body.includes(fields.scheduleOverview.trim())
        ? [
            "Resumen del horario (según el WCIF de la competencia):",
            "",
            fields.scheduleOverview.trim(),
          ].join("\n")
        : null,
    ].filter((bit): bit is string => Boolean(bit));
    if (bits.length > 0 && !body.includes("## Check-in")) {
      sections.push("", "## Check-in y horario", "", ...bits);
    }
  }
  if (
    fields.address?.trim() ||
    fields.mapsUrl?.trim() ||
    fields.parking?.trim()
  ) {
    const locationBits = [
      fields.address?.trim() && !body.includes(fields.address.trim())
        ? `**Lugar:** ${fields.address.trim()}`
        : null,
      fields.mapsUrl?.trim() && !body.includes(fields.mapsUrl.trim())
        ? `**Ubicación en Google Maps:** [${fields.mapsUrl.trim()}](${fields.mapsUrl.trim()})`
        : null,
      fields.parking?.trim() && !body.includes(fields.parking.trim())
        ? `**Estacionamiento:** ${fields.parking.trim()}`
        : null,
    ].filter((bit): bit is string => Boolean(bit));
    if (locationBits.length > 0) {
      sections.push("", "## Ubicación", "", ...locationBits);
    }
  }
  pushSection("Eventos no oficiales", fields.unofficialEvents);
  if (fields.groupsUrl?.trim() && !body.includes(fields.groupsUrl.trim())) {
    sections.push(
      "",
      "## Grupos y asignaciones",
      "",
      `[${fields.groupsUrl.trim()}](${fields.groupsUrl.trim()})`,
    );
  }
  pushSection("Agradecimientos", fields.thanks);
  if (
    fields.scheduleUrl?.trim() &&
    !body.includes(fields.scheduleUrl.trim())
  ) {
    sections.push(
      "",
      "Horario oficial:",
      "",
      `[${fields.scheduleUrl.trim()}](${fields.scheduleUrl.trim()})`,
    );
  }

  if (sections.length === 0) return body;
  return `${body.trimEnd()}\n${sections.join("\n")}`;
}

export type InformativeEmailDraftData = {
  subject: string;
  body: string;
  updateNote: string;
  /** Auto from public WCIF (`other-checkin` / `other-registration`). */
  checkIn: string;
  /** Auto from public WCIF (`other-tutorial`). */
  tutorialTime: string;
  /** WCA competition page (schedule lives there). */
  scheduleUrl: string;
  /** Auto from public WCA venue fields. */
  address: string;
  /** Markdown bullet list of top-level WCIF activities. */
  scheduleOverview: string;
  mapsUrl: string;
  parking: string;
  unofficialEvents: string;
  groupsUrl: string;
  thanks: string;
  sentAt: string | null;
  sentRecipientCount: number | null;
  canSend: boolean;
  wcaCompetitionUrl: string | null;
};

export async function loadInformativeEmailCard(input: {
  boardId: number;
  cardId: number;
}): Promise<ActionFail | ActionOk<{ data: InformativeEmailDraftData }>> {
  const session = await requireSessionOrUnauthorized();
  if (!(await canAccessBoard(session.user, input.boardId))) {
    return { ok: false, message: "No tienes acceso a este tablero" };
  }
  const userId = await resolveSessionUserId(session.user);
  await assertInformativeEmailCard(input.boardId, input.cardId);

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
  const draft = await buildSeedDraft(competition);

  return {
    ok: true,
    message: "Borrador cargado",
    data: {
      ...draft,
      sentAt: competition.informativeEmailSentAt?.toISOString() ?? null,
      sentRecipientCount: competition.informativeEmailRecipientCount,
      canSend: role.ok,
      wcaCompetitionUrl: competition.wcaCompetitionUrl,
    },
  };
}

const draftSchema = z.object({
  boardId: z.number().int().positive(),
  cardId: z.number().int().positive(),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(20000),
  updateNote: optionalText,
  mapsUrl: optionalUrl,
  parking: optionalText,
  unofficialEvents: optionalText,
  thanks: optionalText,
});

export async function saveInformativeEmailDraft(
  raw: z.input<typeof draftSchema>,
): Promise<ActionFail | ActionOk> {
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Revisa el asunto, el cuerpo y los campos" };
  }
  const input = parsed.data;
  const actor = await requireBoardAccess(input.boardId);
  await assertInformativeEmailCard(input.boardId, input.cardId);

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
    key: `boards:informative-email-draft:user:${actor.id}`,
    windowMs: 10 * 60 * 1000,
    max: 60,
  });
  if (!allowed) {
    return {
      ok: false,
      message: "Espera unos minutos antes de volver a guardar el borrador",
    };
  }

  const wcaDefaults = await loadInformativeEmailWcaDefaults(
    competition.wcaCompetitionUrl,
  );
  const scheduleUrl =
    resolvedScheduleUrl(competition.wcaCompetitionUrl) || null;

  await db
    .update(competitions)
    .set({
      informativeEmailSubject: input.subject,
      informativeEmailBody: input.body,
      informativeEmailUpdateNote: input.updateNote,
      informativeEmailCheckIn: wcaDefaults.checkIn || null,
      informativeEmailTutorialTime: wcaDefaults.tutorialTime || null,
      informativeEmailScheduleUrl: scheduleUrl,
      informativeEmailAddress: wcaDefaults.address || null,
      informativeEmailMapsUrl: input.mapsUrl,
      informativeEmailParking: input.parking,
      informativeEmailUnofficialEvents: input.unofficialEvents,
      informativeEmailGroupsUrl: resolvedGroupsUrl(
        competition.wcaCompetitionUrl,
      ) || null,
      informativeEmailThanks: input.thanks,
      updatedAt: new Date(),
    })
    .where(eq(competitions.id, competition.id));

  revalidatePath(`/boards/${input.boardId}`);
  return { ok: true, message: "Borrador guardado" };
}

export async function previewInformativeEmailRecipients(input: {
  boardId: number;
  cardId: number;
}): Promise<
  ActionFail | ActionOk<{ count: number; sampleNames: string[] }>
> {
  const actor = await requireBoardAccess(input.boardId);
  await assertInformativeEmailCard(input.boardId, input.cardId);

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
    key: `boards:informative-email-preview:user:${actor.id}`,
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

const sendSchema = draftSchema.extend({
  confirmResend: z.boolean().optional(),
});

export async function sendInformativeEmail(
  raw: z.input<typeof sendSchema>,
): Promise<ActionFail | ActionOk<{ recipientCount: number }>> {
  const parsed = sendSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Revisa el asunto, el cuerpo y los campos" };
  }
  const input = parsed.data;
  const actor = await requireBoardAccess(input.boardId);
  await assertInformativeEmailCard(input.boardId, input.cardId);

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

  if (competition.informativeEmailSentAt && !input.confirmResend) {
    return {
      ok: false,
      message:
        "Este correo ya se envió. Confirma el reenvío si quieres mandarlo otra vez.",
    };
  }

  const [userLimit, competitionLimit] = await Promise.all([
    consumeRateLimit({
      key: `boards:informative-email:user:${actor.id}`,
      windowMs: 60 * 60 * 1000,
      max: 5,
    }),
    consumeRateLimit({
      key: `boards:informative-email:competition:${competition.id}`,
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
    columns: { email: true },
  });
  const replyTo =
    sender && isDeliverableEmail(sender.email) ? sender.email : undefined;

  const wcaDefaults = await loadInformativeEmailWcaDefaults(
    competition.wcaCompetitionUrl,
  );
  const scheduleUrl =
    resolvedScheduleUrl(competition.wcaCompetitionUrl) || null;
  const groupsUrl =
    resolvedGroupsUrl(competition.wcaCompetitionUrl) || null;
  const bodyWithOptionals = appendOptionalFieldsToBody(input.body, {
    updateNote: input.updateNote,
    checkIn: wcaDefaults.checkIn || null,
    tutorialTime: wcaDefaults.tutorialTime || null,
    scheduleOverview: wcaDefaults.scheduleOverview || null,
    scheduleUrl,
    address: wcaDefaults.address || null,
    mapsUrl: input.mapsUrl,
    parking: input.parking,
    unofficialEvents: input.unofficialEvents,
    groupsUrl,
    thanks: input.thanks,
  });

  await db
    .update(competitions)
    .set({
      informativeEmailSubject: input.subject,
      informativeEmailBody: input.body,
      informativeEmailUpdateNote: input.updateNote,
      informativeEmailCheckIn: wcaDefaults.checkIn || null,
      informativeEmailTutorialTime: wcaDefaults.tutorialTime || null,
      informativeEmailScheduleUrl: scheduleUrl,
      informativeEmailAddress: wcaDefaults.address || null,
      informativeEmailMapsUrl: input.mapsUrl,
      informativeEmailParking: input.parking,
      informativeEmailUnofficialEvents: input.unofficialEvents,
      informativeEmailGroupsUrl: groupsUrl,
      informativeEmailThanks: input.thanks,
      updatedAt: new Date(),
    })
    .where(eq(competitions.id, competition.id));

  const competitionLogoUrl = await loadCompetitionLogoUrl(
    competition.wcaCompetitionUrl,
  );
  const teamFooter = competitionTeamEmailFooterHtml({
    people: teamFooterPeopleFromCompetition(competition),
    logoUrl: competitionLogoUrl,
    competitionName: competition.name,
  });
  const html = renderEmailLayout({
    previewText: input.subject,
    title: input.subject,
    bodyHtml: `${markdownEmailBodyToHtml(bodyWithOptionals)}${teamFooter}`,
  });

  const sent = await sendEmails(
    loaded.recipients.map((recipient) => ({
      to: recipient.email,
      subject: input.subject,
      html,
      replyTo,
    })),
  );
  if (!sent.ok) {
    log.error("boards.informative_email_send_failed", {
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
      informativeEmailSentAt: new Date(),
      informativeEmailSentByUserId: actor.id,
      informativeEmailRecipientCount: sent.sent,
      updatedAt: new Date(),
    })
    .where(eq(competitions.id, competition.id));

  log.info("boards.informative_email_sent", {
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
