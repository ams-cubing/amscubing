import { Resend } from "resend";

import {
  AMS_EMAIL,
  emailParagraph,
  escapeHtml,
  renderEmailLayout,
} from "./layout";
import { log } from "@workspace/server/log";

export { AMS_EMAIL, escapeHtml, renderEmailLayout } from "./layout";

const FROM = "Asociación Mexicana de Speedcubing <no-reply@amscubing.org>";

let resendClient: Resend | null = null;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function isDeliverableEmail(
  email: string | null | undefined,
): email is string {
  if (!email) return false;
  return !email.includes("@ams.placeholder");
}

const RESEND_BATCH_SIZE = 100;

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string | string[];
};

export async function sendEmail(input: SendEmailInput) {
  const resend = getResend();
  if (!resend) {
    log.warn("email.skipped_missing_api_key");
    return { ok: false as const, reason: "missing_api_key" as const };
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
    if (result.error)
      return { ok: false as const, reason: "send_failed" as const };
    return { ok: true as const };
  } catch (err) {
    log.error("email.send_failed", { error: err });
    return { ok: false as const, reason: "send_failed" as const };
  }
}

/** Sends many emails via Resend batch API (chunks of 100). */
export async function sendEmails(inputs: SendEmailInput[]) {
  if (inputs.length === 0) {
    return { ok: true as const, sent: 0 };
  }

  const resend = getResend();
  if (!resend) {
    log.warn("email.skipped_missing_api_key");
    return { ok: false as const, reason: "missing_api_key" as const, sent: 0 };
  }

  let sent = 0;
  try {
    for (let i = 0; i < inputs.length; i += RESEND_BATCH_SIZE) {
      const chunk = inputs.slice(i, i + RESEND_BATCH_SIZE).map((email) => ({
        from: FROM,
        to: email.to,
        subject: email.subject,
        html: email.html,
        ...(email.replyTo ? { replyTo: email.replyTo } : {}),
      }));
      const result = await resend.batch.send(chunk);
      if (result.error) {
        log.error("email.batch_send_failed", {
          error: result.error,
          offset: i,
          chunkSize: chunk.length,
        });
        return { ok: false as const, reason: "send_failed" as const, sent };
      }
      sent += chunk.length;
    }
    return { ok: true as const, sent };
  } catch (err) {
    log.error("email.batch_send_failed", { error: err, sent });
    return { ok: false as const, reason: "send_failed" as const, sent };
  }
}

export function boardNotificationEmail(input: {
  recipientName: string;
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  const name = input.recipientName.trim() || "Hola";
  return renderEmailLayout({
    previewText: input.title,
    title: input.title,
    bodyHtml: `${emailParagraph(`Hola ${escapeHtml(name)},`)}${input.bodyHtml}`,
    cta: { label: input.ctaLabel, href: input.ctaHref },
  });
}

export function delegateAssignedEmail(input: {
  recipientName: string;
  city: string;
  startDate: string;
  endDate: string;
  panelUrl: string;
}) {
  return renderEmailLayout({
    previewText: `Asignación como delegado: ${input.city}`,
    bodyHtml: [
      emailParagraph(`Hola ${escapeHtml(input.recipientName)},`),
      emailParagraph(
        `Has sido asignado como delegado para una competencia en ${escapeHtml(input.city)} (${escapeHtml(input.startDate)} - ${escapeHtml(input.endDate)}).`,
      ),
    ].join(""),
    cta: {
      label: "Revisa el panel de competencias para más detalles",
      href: input.panelUrl,
    },
  });
}

export function delegateAssignedSubject(input: {
  city: string;
  startDate: string;
  endDate: string;
}) {
  return `Asignación como delegado: ${input.city} (${input.startDate} - ${input.endDate})`;
}

export function delegateRemovedEmail(input: {
  recipientName: string;
  city: string;
  startDate: string;
  endDate: string;
  panelUrl: string;
}) {
  return renderEmailLayout({
    previewText: `Remoción como delegado: ${input.city}`,
    bodyHtml: [
      emailParagraph(`Hola ${escapeHtml(input.recipientName)},`),
      emailParagraph(
        `Has sido removido como delegado de una competencia en ${escapeHtml(input.city)} (${escapeHtml(input.startDate)} - ${escapeHtml(input.endDate)}).`,
      ),
    ].join(""),
    cta: {
      label: "Revisa el panel de competencias para más detalles",
      href: input.panelUrl,
    },
  });
}

export function delegateRemovedSubject(input: {
  city: string;
  startDate: string;
  endDate: string;
}) {
  return `Remoción como delegado: ${input.city} (${input.startDate} - ${input.endDate})`;
}

export function ultimatumEmail(input: { deadline: Date; message?: string }) {
  const body =
    input.message?.trim() ||
    "Por favor, asegúrate de cumplir con los requisitos antes de la fecha límite.";
  return renderEmailLayout({
    previewText: "Ultimátum enviado para tu competencia",
    bodyHtml: [
      emailParagraph("Hola,"),
      emailParagraph(
        "Se ha enviado un ultimátum para una de tus competencias.",
      ),
      emailParagraph(
        `Fecha límite: ${escapeHtml(input.deadline.toLocaleDateString())}`,
      ),
      emailParagraph(escapeHtml(body)),
    ].join(""),
  });
}

export const ultimatumSubject = "Ultimátum enviado para tu competencia";

export function dateRequestDelegateEmail(input: {
  delegateName: string;
  city: string;
  startDate: string;
  endDate: string;
  panelUrl: string;
}) {
  return renderEmailLayout({
    previewText: `Nueva propuesta de delegación: ${input.city}`,
    bodyHtml: [
      emailParagraph(`Hola ${escapeHtml(input.delegateName)},`),
      emailParagraph(
        `Se te propuso como delegado para la competencia en ${escapeHtml(input.city)} (${escapeHtml(input.startDate)} - ${escapeHtml(input.endDate)}). Confirma o rechaza la asignación en el panel.`,
      ),
    ].join(""),
    cta: {
      label: "Confirmar o rechazar en el panel",
      href: input.panelUrl,
    },
  });
}

export function dateRequestDelegateSubject(input: {
  city: string;
  startDate: string;
  endDate: string;
}) {
  return `Nueva propuesta de delegación: ${input.city} (${input.startDate} - ${input.endDate})`;
}

export function dateRequestOrganizerEmail(input: {
  organizerName: string;
  city: string;
  startDate: string;
  endDate: string;
  delegateName: string | null;
  delegateEmail: string | null;
  pendingConfirmation: boolean;
  myCompetitionsUrl: string;
}) {
  const delegateParagraph = input.pendingConfirmation
    ? emailParagraph(
        `Se propuso a ${escapeHtml(input.delegateName ?? "un delegado")} para esta fecha. La asignación queda pendiente de su confirmación.`,
      )
    : emailParagraph(
        `Aún no se ha propuesto un delegado para esta fecha. El equipo de AMS dará seguimiento.`,
      );

  return renderEmailLayout({
    previewText: `Fecha solicitada en ${input.city}`,
    bodyHtml: [
      emailParagraph(`Hola ${escapeHtml(input.organizerName)},`),
      emailParagraph(
        `Tu solicitud de fecha para una competencia en ${escapeHtml(input.city)} (${escapeHtml(input.startDate)} - ${escapeHtml(input.endDate)}) ha sido creada exitosamente.`,
      ),
      delegateParagraph,
    ].join(""),
    cta: {
      label: "Revisa los detalles aquí",
      href: input.myCompetitionsUrl,
    },
  });
}

export function dateRequestOrganizerSubject(input: {
  city: string;
  startDate: string;
  endDate: string;
}) {
  return `Fecha solicitada en ${input.city} (${input.startDate} - ${input.endDate})`;
}

export function dateRequestAcceptedOrganizerEmail(input: {
  organizerName: string;
  city: string;
  startDate: string;
  endDate: string;
  delegateName: string;
  delegateEmail: string;
  myCompetitionsUrl: string;
}) {
  return renderEmailLayout({
    previewText: `Delegado confirmado en ${input.city}`,
    bodyHtml: [
      emailParagraph(`Hola ${escapeHtml(input.organizerName)},`),
      emailParagraph(
        `${escapeHtml(input.delegateName)} confirmó la delegación para la competencia en ${escapeHtml(input.city)} (${escapeHtml(input.startDate)} - ${escapeHtml(input.endDate)}).`,
      ),
      emailParagraph(
        `Puedes contactarlo en: ${escapeHtml(input.delegateEmail)}`,
      ),
    ].join(""),
    cta: {
      label: "Revisa los detalles aquí",
      href: input.myCompetitionsUrl,
    },
  });
}

export function dateRequestAcceptedOrganizerSubject(input: { city: string }) {
  return `Delegado confirmado: ${input.city}`;
}

export function dateRequestDeclinedOrganizerEmail(input: {
  organizerName: string;
  city: string;
  startDate: string;
  endDate: string;
  nextDelegateName: string | null;
  reason: string;
  myCompetitionsUrl: string;
}) {
  const followUp = input.nextDelegateName
    ? emailParagraph(
        `Se propuso a ${escapeHtml(input.nextDelegateName)} como siguiente opción. Queda pendiente de su confirmación.`,
      )
    : emailParagraph(
        `Por ahora no hay otro delegado disponible para esa fecha. El equipo de AMS dará seguimiento.`,
      );

  return renderEmailLayout({
    previewText: `Actualización de delegación en ${input.city}`,
    bodyHtml: [
      emailParagraph(`Hola ${escapeHtml(input.organizerName)},`),
      emailParagraph(
        `Hubo un cambio en la propuesta de delegado para tu competencia en ${escapeHtml(input.city)} (${escapeHtml(input.startDate)} - ${escapeHtml(input.endDate)}).`,
      ),
      emailParagraph(
        `<strong>Motivo del rechazo:</strong><br />${escapeHtml(input.reason).replace(/\n/g, "<br />")}`,
      ),
      followUp,
    ].join(""),
    cta: {
      label: "Revisa los detalles aquí",
      href: input.myCompetitionsUrl,
    },
  });
}

export function dateRequestDeclinedOrganizerSubject(input: { city: string }) {
  return `Actualización de delegación: ${input.city}`;
}

export function organizerAssignedEmail(input: {
  recipientName: string;
  city: string;
  startDate: string;
  endDate: string;
  myCompetitionsUrl: string;
}) {
  return renderEmailLayout({
    previewText: `Asignación como organizador: ${input.city}`,
    bodyHtml: [
      emailParagraph(`Hola ${escapeHtml(input.recipientName)},`),
      emailParagraph(
        `Has sido asignado como organizador para una competencia en ${escapeHtml(input.city)} (${escapeHtml(input.startDate)} - ${escapeHtml(input.endDate)}).`,
      ),
    ].join(""),
    cta: {
      label: "Revisa tus competencias para más detalles",
      href: input.myCompetitionsUrl,
    },
  });
}

export function organizerAssignedSubject(input: {
  city: string;
  startDate: string;
  endDate: string;
}) {
  return `Asignación como organizador: ${input.city} (${input.startDate} - ${input.endDate})`;
}

export function organizerRemovedEmail(input: {
  recipientName: string;
  city: string;
  startDate: string;
  endDate: string;
  myCompetitionsUrl: string;
}) {
  return renderEmailLayout({
    previewText: `Remoción como organizador: ${input.city}`,
    bodyHtml: [
      emailParagraph(`Hola ${escapeHtml(input.recipientName)},`),
      emailParagraph(
        `Has sido removido como organizador de una competencia en ${escapeHtml(input.city)} (${escapeHtml(input.startDate)} - ${escapeHtml(input.endDate)}).`,
      ),
    ].join(""),
    cta: {
      label: "Revisa tus competencias para más detalles",
      href: input.myCompetitionsUrl,
    },
  });
}

export function organizerRemovedSubject(input: {
  city: string;
  startDate: string;
  endDate: string;
}) {
  return `Remoción como organizador: ${input.city} (${input.startDate} - ${input.endDate})`;
}

export function competitionStatusChangedEmail(input: {
  recipientName: string;
  city: string;
  statusLabel: string;
  myCompetitionsUrl: string;
}) {
  return renderEmailLayout({
    previewText: `Estatus: ${input.statusLabel} — ${input.city}`,
    bodyHtml: [
      emailParagraph(`Hola ${escapeHtml(input.recipientName)},`),
      emailParagraph(
        `El estatus de la competencia en ${escapeHtml(input.city)} cambió a <strong>${escapeHtml(input.statusLabel)}</strong>.`,
      ),
    ].join(""),
    cta: {
      label: "Revisa los detalles aquí",
      href: input.myCompetitionsUrl,
    },
  });
}

export function competitionStatusChangedSubject(input: {
  city: string;
  statusLabel: string;
}) {
  return `Estatus: ${input.statusLabel} — ${input.city}`;
}

export type CompetitionThankYouEmailInput = {
  competitionName: string;
  dateLabel: string;
  placeLabel: string;
  wcaCompetitionUrl: string;
  wcaLiveUrl: string;
  sponsorNames: string[];
  surveyUrl?: string | null;
  certificatesUrl?: string | null;
  photosUrl?: string | null;
  expenseSummaryUrl?: string | null;
};

function optionalLinkParagraph(label: string, href: string | null | undefined) {
  const trimmed = href?.trim();
  if (!trimmed) return "";
  return emailParagraph(
    `${escapeHtml(label)}: <a href="${escapeHtml(trimmed)}" style="color:${AMS_EMAIL.orange};">${escapeHtml(trimmed)}</a>`,
  );
}

export function competitionThankYouSubject(input: {
  competitionName: string;
}) {
  return `${input.competitionName} – Agradecimiento y resultados del evento`;
}

export function competitionThankYouEmail(input: CompetitionThankYouEmailInput) {
  const sponsorsBlock =
    input.sponsorNames.length > 0
      ? emailParagraph(
          input.sponsorNames.map((name) => escapeHtml(name)).join(", "),
        )
      : "";

  const surveyBlock = optionalLinkParagraph(
    "Encuesta de calidad",
    input.surveyUrl,
  );
  const certificatesBlock = optionalLinkParagraph(
    "Reconocimientos digitales",
    input.certificatesUrl,
  );
  const photosBlock = optionalLinkParagraph(
    "Fotografías del evento",
    input.photosUrl,
  );
  const expenseBlock = optionalLinkParagraph(
    "Resumen de gastos",
    input.expenseSummaryUrl,
  );

  return renderEmailLayout({
    previewText: `Agradecimiento — ${input.competitionName}`,
    title: "Agradecimiento post-competencia",
    bodyHtml: [
      emailParagraph("Hola competidores:"),
      emailParagraph(
        `Queremos agradecerles por haber formado parte de <strong>${escapeHtml(input.competitionName)}</strong>, realizada el ${escapeHtml(input.dateLabel)} en ${escapeHtml(input.placeLabel)}. Gracias a su participación, apoyo y colaboración durante el evento, fue posible llevar a cabo una competencia organizada, divertida y llena de grandes momentos para la comunidad.`,
      ),
      emailParagraph(
        "Esperamos que hayan disfrutado la experiencia y que continúen participando en futuras competencias oficiales de la World Cube Association.",
      ),
      emailParagraph("<strong>Resultados de la competencia</strong>"),
      emailParagraph(
        `Puedes consultar los resultados oficiales en la página del evento en la WCA: <a href="${escapeHtml(input.wcaCompetitionUrl)}" style="color:${AMS_EMAIL.orange};">${escapeHtml(input.wcaCompetitionUrl)}</a>`,
      ),
      emailParagraph(
        `También puedes revisar los resultados detallados en WCA Live: <a href="${escapeHtml(input.wcaLiveUrl)}" style="color:${AMS_EMAIL.orange};">${escapeHtml(input.wcaLiveUrl)}</a>`,
      ),
      emailParagraph("<strong>Agradecimiento a patrocinadores</strong>"),
      emailParagraph(
        "Queremos expresar un agradecimiento especial a nuestros patrocinadores y colaboradores, quienes hicieron posible la realización del evento.",
      ),
      sponsorsBlock,
      emailParagraph(
        "Su apoyo es fundamental para continuar desarrollando competencias de speedcubing en nuestra región.",
      ),
      expenseBlock
        ? `${emailParagraph("<strong>Resumen de gastos</strong>")}${emailParagraph("Como parte de nuestro compromiso con la transparencia, compartimos un resumen general del uso de la cuota de registro del evento:")}${expenseBlock}`
        : "",
      certificatesBlock
        ? `${emailParagraph("<strong>Reconocimientos digitales</strong>")}${emailParagraph("Hemos preparado reconocimientos digitales para los competidores que obtuvieron podio en cada evento. Puedes descargarlos aquí:")}${certificatesBlock}`
        : "",
      photosBlock
        ? `${emailParagraph("<strong>Fotografías del evento</strong>")}${emailParagraph("Si deseas revivir algunos momentos de la competencia, puedes consultar la galería aquí:")}${photosBlock}`
        : "",
      surveyBlock
        ? `${emailParagraph("<strong>Encuesta de calidad</strong>")}${emailParagraph("Nos ayuda mucho conocer tu experiencia. Puedes responder la encuesta aquí:")}${surveyBlock}`
        : "",
      emailParagraph(
        "Nuevamente, muchas gracias por formar parte de esta competencia y contribuir al crecimiento de la comunidad.",
      ),
      emailParagraph(
        `Atentamente,<br/>Equipo Organizador de ${escapeHtml(input.competitionName)}`,
      ),
    ].join(""),
  });
}

/** Plain-text draft body for the compose form (Markdown-ish links as URLs). */
export function competitionThankYouPlainBody(
  input: CompetitionThankYouEmailInput,
) {
  const lines = [
    "Hola competidores:",
    "",
    `Queremos agradecerles por haber formado parte de ${input.competitionName}, realizada el ${input.dateLabel} en ${input.placeLabel}.`,
    "Gracias a su participación, apoyo y colaboración durante el evento, fue posible llevar a cabo una competencia organizada, divertida y llena de grandes momentos para la comunidad.",
    "",
    "Esperamos que hayan disfrutado la experiencia y que continúen participando en futuras competencias oficiales de la World Cube Association.",
    "",
    "Resultados de la competencia",
    "",
    `Puedes consultar los resultados oficiales en la página del evento en la WCA: ${input.wcaCompetitionUrl}`,
    "",
    `También puedes revisar los resultados detallados en WCA Live: ${input.wcaLiveUrl}`,
    "",
    "Agradecimiento a patrocinadores",
    "Queremos expresar un agradecimiento especial a nuestros patrocinadores y colaboradores, quienes hicieron posible la realización del evento.",
  ];

  if (input.sponsorNames.length > 0) {
    lines.push(input.sponsorNames.join(", "));
  }
  lines.push(
    "Su apoyo es fundamental para continuar desarrollando competencias de speedcubing en nuestra región.",
  );

  if (input.expenseSummaryUrl?.trim()) {
    lines.push(
      "",
      "Resumen de Gastos",
      "Como parte de nuestro compromiso con la transparencia, compartimos un resumen general del uso de la cuota de registro del evento:",
      input.expenseSummaryUrl.trim(),
    );
  }
  if (input.certificatesUrl?.trim()) {
    lines.push(
      "",
      "Reconocimientos Digitales",
      "Hemos preparado reconocimientos digitales para los competidores que obtuvieron podio en cada evento.",
      `Puedes descargarlos en: ${input.certificatesUrl.trim()}`,
    );
  }
  if (input.photosUrl?.trim()) {
    lines.push(
      "",
      "Fotografías del Evento",
      `Si deseas revivir algunos momentos de la competencia, puedes consultar la galería aquí: ${input.photosUrl.trim()}`,
    );
  }
  if (input.surveyUrl?.trim()) {
    lines.push(
      "",
      "Encuesta de Calidad",
      `Nos ayuda mucho conocer tu experiencia: ${input.surveyUrl.trim()}`,
    );
  }

  lines.push(
    "",
    "Nuevamente, muchas gracias por formar parte de esta competencia y contribuir al crecimiento de la comunidad.",
    "",
    "Atentamente,",
    "",
    `Equipo Organizador de ${input.competitionName}`,
  );

  return lines.join("\n");
}

/** Convert the plain compose body into simple HTML paragraphs for sending. */
export function plainTextEmailBodyToHtml(body: string) {
  const escaped = escapeHtml(body.trim());
  if (!escaped) return "";
  const withLinks = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) =>
      `<a href="${url}" style="color:${AMS_EMAIL.orange};word-break:break-all;">${url}</a>`,
  );
  return withLinks
    .split(/\n{2,}/)
    .map((paragraph) =>
      emailParagraph(paragraph.replaceAll("\n", "<br />")),
    )
    .join("");
}
