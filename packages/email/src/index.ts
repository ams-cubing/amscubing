import { Resend } from "resend";

import { marked } from "marked";

import {
  AMS_EMAIL,
  emailParagraph,
  escapeHtml,
  renderEmailLayout,
} from "./layout";
import { log } from "@workspace/server/log";

export { AMS_EMAIL, escapeHtml, renderEmailLayout } from "./layout";

/** Placeholder in the Markdown draft replaced by the budget HTML table on send. */
export const BUDGET_SUMMARY_PLACEHOLDER = "{{resumen_gastos}}";

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
  /** Instant Live Results on the WCA website (`/competitions/{id}/live`). */
  ilrUrl: string;
  sponsorNames: string[];
  surveyUrl?: string | null;
  certificatesUrl?: string | null;
  photosUrl?: string | null;
  /** When true, seed includes `{{resumen_gastos}}` for the budget table. */
  includeBudgetSummaryPlaceholder?: boolean;
};

export function competitionIlrUrl(wcaCompetitionId: string) {
  return `https://www.worldcubeassociation.org/competitions/${encodeURIComponent(wcaCompetitionId)}/live`;
}

export function competitionThankYouSubject(input: {
  competitionName: string;
}) {
  return `${input.competitionName} – Agradecimiento y resultados del evento`;
}

function mdLink(label: string, href: string) {
  return `[${label}](${href})`;
}

/** Markdown draft body for the compose form. */
export function competitionThankYouMarkdownBody(
  input: CompetitionThankYouEmailInput,
) {
  const lines = [
    "Hola competidores:",
    "",
    `Queremos agradecerles por haber formado parte de **${input.competitionName}**, realizada el ${input.dateLabel} en ${input.placeLabel}.`,
    "",
    "Gracias a su participación, apoyo y colaboración durante el evento, fue posible llevar a cabo una competencia organizada, divertida y llena de grandes momentos para la comunidad.",
    "",
    "Esperamos que hayan disfrutado la experiencia y que continúen participando en futuras competencias oficiales de la World Cube Association.",
    "",
    "## Resultados de la competencia",
    "",
    `Puedes consultar los resultados oficiales en la página del evento en la WCA: ${mdLink(input.wcaCompetitionUrl, input.wcaCompetitionUrl)}`,
    "",
    `También puedes revisar los resultados en vivo (ILR): ${mdLink(input.ilrUrl, input.ilrUrl)}`,
    "",
    "## Agradecimiento a patrocinadores",
    "",
    "Queremos expresar un agradecimiento especial a nuestros patrocinadores y colaboradores, quienes hicieron posible la realización del evento.",
  ];

  if (input.sponsorNames.length > 0) {
    lines.push(
      "",
      input.sponsorNames
        .map((name) => `- ${escapeHtml(name).replaceAll("|", "\\|")}`)
        .join("\n"),
    );
  }
  lines.push(
    "",
    "Su apoyo es fundamental para continuar desarrollando competencias de speedcubing en nuestra región.",
  );

  if (input.includeBudgetSummaryPlaceholder !== false) {
    lines.push(
      "",
      "## Resumen de gastos",
      "",
      "Como parte de nuestro compromiso con la transparencia, compartimos un resumen general del uso de la cuota de registro del evento:",
      "",
      BUDGET_SUMMARY_PLACEHOLDER,
    );
  }

  if (input.certificatesUrl?.trim()) {
    lines.push(
      "",
      "## Reconocimientos digitales",
      "",
      "Hemos preparado reconocimientos digitales para los competidores que obtuvieron podio en cada evento.",
      "",
      mdLink("Descargar reconocimientos", input.certificatesUrl.trim()),
    );
  }
  if (input.photosUrl?.trim()) {
    lines.push(
      "",
      "## Fotografías del evento",
      "",
      `Si deseas revivir algunos momentos de la competencia, puedes consultar la galería aquí: ${mdLink("Ver fotografías", input.photosUrl.trim())}`,
    );
  }
  if (input.surveyUrl?.trim()) {
    lines.push(
      "",
      "## Encuesta de calidad",
      "",
      `Nos ayuda mucho conocer tu experiencia: ${mdLink("Responder encuesta", input.surveyUrl.trim())}`,
    );
  }

  lines.push(
    "",
    "Nuevamente, muchas gracias por formar parte de esta competencia y contribuir al crecimiento de la comunidad.",
    "",
    "Atentamente,",
    "",
    `**Equipo Organizador de ${input.competitionName}**`,
  );

  return lines.join("\n");
}

/** @deprecated Use competitionThankYouMarkdownBody */
export const competitionThankYouPlainBody = competitionThankYouMarkdownBody;

function formatMxn(cents: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(cents / 100);
}

export type BudgetSummaryEmailLine = {
  kind: "expense" | "income";
  label: string;
  expectedCents: number;
  actualCents: number | null;
};

export type BudgetSummaryEmailInput = {
  lines: BudgetSummaryEmailLine[];
  summary: {
    actualIncomeCents: number;
    actualExpenseCents: number;
    actualNetCents: number;
  };
};

/** Email-safe HTML table of competition budget actuals (fallback to expected). */
export function competitionBudgetSummaryTableHtml(
  input: BudgetSummaryEmailInput | null,
) {
  if (!input || input.lines.length === 0) {
    return emailParagraph(
      "<em>El resumen de gastos aún no está disponible.</em>",
    );
  }

  const { navy, soft, fontStack } = AMS_EMAIL;
  const rowHtml = input.lines
    .map((line) => {
      const amountLabel =
        line.actualCents != null
          ? formatMxn(line.actualCents)
          : `${formatMxn(line.expectedCents)} (esperado)`;
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e8e8e8;font-family:${fontStack};font-size:13px;color:${navy};">${escapeHtml(line.kind === "expense" ? "Gasto" : "Ingreso")}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e8e8e8;font-family:${fontStack};font-size:13px;color:${navy};">${escapeHtml(line.label)}</td>
        <td align="right" style="padding:8px 10px;border-bottom:1px solid #e8e8e8;font-family:${fontStack};font-size:13px;color:${navy};white-space:nowrap;">${escapeHtml(amountLabel)}</td>
      </tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 18px;border-collapse:collapse;background-color:${soft};border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;">
  <thead>
    <tr>
      <th align="left" style="padding:10px;background-color:${navy};color:#ffffff;font-family:${fontStack};font-size:12px;font-weight:700;">Tipo</th>
      <th align="left" style="padding:10px;background-color:${navy};color:#ffffff;font-family:${fontStack};font-size:12px;font-weight:700;">Concepto</th>
      <th align="right" style="padding:10px;background-color:${navy};color:#ffffff;font-family:${fontStack};font-size:12px;font-weight:700;">Monto</th>
    </tr>
  </thead>
  <tbody>${rowHtml}</tbody>
  <tfoot>
    <tr>
      <td colspan="2" style="padding:10px;font-family:${fontStack};font-size:13px;font-weight:700;color:${navy};">Ingresos</td>
      <td align="right" style="padding:10px;font-family:${fontStack};font-size:13px;font-weight:700;color:${navy};">${escapeHtml(formatMxn(input.summary.actualIncomeCents))}</td>
    </tr>
    <tr>
      <td colspan="2" style="padding:10px;font-family:${fontStack};font-size:13px;font-weight:700;color:${navy};">Egresos</td>
      <td align="right" style="padding:10px;font-family:${fontStack};font-size:13px;font-weight:700;color:${navy};">${escapeHtml(formatMxn(input.summary.actualExpenseCents))}</td>
    </tr>
    <tr>
      <td colspan="2" style="padding:10px;font-family:${fontStack};font-size:14px;font-weight:700;color:${navy};">Remanente</td>
      <td align="right" style="padding:10px;font-family:${fontStack};font-size:14px;font-weight:700;color:${navy};">${escapeHtml(formatMxn(input.summary.actualNetCents))}</td>
    </tr>
  </tfoot>
</table>`;
}

function styleMarkdownEmailHtml(html: string) {
  const { navy, orange, fontStack } = AMS_EMAIL;
  return html
    .replace(
      /<h2>/g,
      `<h2 style="margin:20px 0 10px;font-family:${fontStack};font-size:17px;font-weight:700;line-height:1.3;color:${navy};">`,
    )
    .replace(
      /<h3>/g,
      `<h3 style="margin:16px 0 8px;font-family:${fontStack};font-size:15px;font-weight:700;line-height:1.3;color:${navy};">`,
    )
    .replace(
      /<p>/g,
      `<p style="margin:0 0 14px;font-family:${fontStack};font-size:15px;line-height:1.55;color:${navy};">`,
    )
    .replace(
      /<ul>/g,
      `<ul style="margin:0 0 14px;padding-left:22px;font-family:${fontStack};font-size:15px;line-height:1.55;color:${navy};">`,
    )
    .replace(
      /<ol>/g,
      `<ol style="margin:0 0 14px;padding-left:22px;font-family:${fontStack};font-size:15px;line-height:1.55;color:${navy};">`,
    )
    .replace(
      /<li>/g,
      `<li style="margin:0 0 4px;font-family:${fontStack};font-size:15px;line-height:1.55;color:${navy};">`,
    )
    .replace(
      /<a /g,
      `<a style="color:${orange};word-break:break-word;" `,
    )
    .replace(
      /<strong>/g,
      `<strong style="font-weight:700;color:${navy};">`,
    )
    .replace(
      /<em>/g,
      `<em style="font-style:italic;color:${navy};">`,
    );
}

/**
 * Convert Markdown compose body to email HTML.
 * Replaces `{{resumen_gastos}}` with the budget table HTML when provided.
 */
export function markdownEmailBodyToHtml(
  body: string,
  options?: { budgetSummaryHtml?: string | null },
) {
  let source = body.trim();
  if (!source) return "";

  const budgetHtml =
    options?.budgetSummaryHtml?.trim() ||
    competitionBudgetSummaryTableHtml(null);

  if (source.includes(BUDGET_SUMMARY_PLACEHOLDER)) {
    // Keep a stable token through Markdown parsing, then swap for the table.
    source = source.replaceAll(
      BUDGET_SUMMARY_PLACEHOLDER,
      "@@BUDGET_SUMMARY_TABLE@@",
    );
  }

  const parsed = marked.parse(source, {
    async: false,
    gfm: true,
    breaks: true,
  }) as string;

  const withBudget = parsed.includes("@@BUDGET_SUMMARY_TABLE@@")
    ? parsed.replaceAll(
        /<p>\s*@@BUDGET_SUMMARY_TABLE@@\s*<\/p>|@@BUDGET_SUMMARY_TABLE@@/g,
        budgetHtml,
      )
    : parsed;

  return styleMarkdownEmailHtml(withBudget);
}

/** @deprecated Use markdownEmailBodyToHtml */
export const plainTextEmailBodyToHtml = markdownEmailBodyToHtml;

export function competitionThankYouEmail(input: CompetitionThankYouEmailInput) {
  return renderEmailLayout({
    previewText: `Agradecimiento — ${input.competitionName}`,
    title: "Agradecimiento post-competencia",
    bodyHtml: markdownEmailBodyToHtml(
      competitionThankYouMarkdownBody(input),
      {
        budgetSummaryHtml: competitionBudgetSummaryTableHtml(null),
      },
    ),
  });
}

export function competitionGroupsUrl(wcaCompetitionId: string) {
  return `https://www.competitiongroups.com/competitions/${encodeURIComponent(wcaCompetitionId)}`;
}

export type CompetitionInformativeEmailInput = {
  competitionName: string;
  dateLabel: string;
  placeLabel: string;
  wcaCompetitionUrl: string;
  ilrUrl: string;
  scheduleUrl?: string | null;
  groupsUrl?: string | null;
  updateNote?: string | null;
  checkIn?: string | null;
  tutorialTime?: string | null;
  /** Markdown bullet list of top-level WCIF activities. */
  scheduleOverview?: string | null;
  address?: string | null;
  mapsUrl?: string | null;
  parking?: string | null;
  unofficialEvents?: string | null;
  thanks?: string | null;
};

export function competitionInformativeSubject(input: {
  competitionName: string;
}) {
  return `${input.competitionName} - Información previa a la competencia`;
}

export function competitionInformativeMarkdownBody(
  input: CompetitionInformativeEmailInput,
) {
  const scheduleUrl =
    input.scheduleUrl?.trim() || input.wcaCompetitionUrl.trim();
  const groupsUrl = input.groupsUrl?.trim() || "";

  const lines = [
    "Hola competidores:",
    "",
    `Si estás recibiendo este correo es porque estás registrado para participar en **${input.competitionName}**, una competencia oficial reconocida por la World Cube Association (WCA), que se celebrará este ${input.dateLabel} en ${input.placeLabel}.`,
    "",
    "Para consultar la información más actualizada sobre la competencia, te invitamos a revisar la página oficial del evento en la WCA:",
    "",
    mdLink(input.wcaCompetitionUrl, input.wcaCompetitionUrl),
  ];

  if (input.updateNote?.trim()) {
    lines.push(
      "",
      "## Actualización importante",
      "",
      input.updateNote.trim(),
    );
  }

  lines.push("", "## Check-in y horario");
  if (input.checkIn?.trim()) {
    lines.push("", `**Check-in:** ${input.checkIn.trim()}`);
  }
  if (input.tutorialTime?.trim()) {
    lines.push(
      "",
      `**Tutorial para nuevos competidores:** ${input.tutorialTime.trim()}`,
    );
  }
  lines.push(
    "",
    "Les pedimos ser puntuales para recoger su gafete de competidor en la mesa de registro, el cual será necesario durante el evento.",
  );
  if (input.scheduleOverview?.trim()) {
    lines.push(
      "",
      "Resumen del horario (según el WCIF de la competencia):",
      "",
      input.scheduleOverview.trim(),
    );
  }
  lines.push(
    "",
    "Consulta el horario completo y actualizado en la página oficial:",
    "",
    mdLink(scheduleUrl, scheduleUrl),
  );

  if (
    input.address?.trim() ||
    input.mapsUrl?.trim() ||
    input.parking?.trim()
  ) {
    lines.push("", "## Ubicación");
    if (input.address?.trim()) {
      lines.push("", `**Lugar:** ${input.address.trim()}`);
    }
    if (input.mapsUrl?.trim()) {
      lines.push(
        "",
        `**Ubicación en Google Maps:** ${mdLink(input.mapsUrl.trim(), input.mapsUrl.trim())}`,
      );
    }
    if (input.parking?.trim()) {
      lines.push("", `**Estacionamiento:** ${input.parking.trim()}`);
    }
  }

  if (input.unofficialEvents?.trim()) {
    lines.push(
      "",
      "## Eventos no oficiales",
      "",
      input.unofficialEvents.trim(),
    );
  }

  lines.push(
    "",
    "## Importante para competidores nuevos",
    "",
    "Si esta es tu primera competencia oficial, debes llevar un documento oficial para verificar tu nombre y nacionalidad. Puede ser:",
    "",
    "- Pasaporte",
    "- INE",
    "- CURP o acta de nacimiento (para menores de edad)",
    "",
    "## Grupos y asignaciones de tareas",
    "",
    "Tus asignaciones estarán impresas en la parte posterior de tu gafete.",
  );
  if (groupsUrl) {
    lines.push(
      "",
      "También puedes consultarlas en el siguiente enlace:",
      "",
      mdLink(groupsUrl, groupsUrl),
    );
  }
  lines.push(
    "",
    "Les recordamos que es muy importante que todos los competidores cumplan con sus tareas asignadas (como jueces, mezcladores o corredores) para asegurar que la competencia se desarrolle de manera fluida y sin retrasos.",
    "",
    "## Resultados en vivo",
    "",
    "Sigue los resultados en tiempo real en ILR:",
    "",
    mdLink(input.ilrUrl, input.ilrUrl),
  );

  if (input.thanks?.trim()) {
    lines.push("", "## Agradecimientos", "", input.thanks.trim());
  }

  lines.push(
    "",
    `¡Nos vemos el ${input.dateLabel} para disfrutar de un gran día de diversión y competencia!`,
    "",
    "Atentamente,",
    "",
    `**Equipo Organizador de ${input.competitionName}**`,
  );

  return lines.join("\n");
}

export type CompetitionTeamFooterPerson = {
  name: string;
  image?: string | null;
  role: "organizador" | "delegado";
};

function footerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

/** Email-safe footer: competition logo + organizers/delegates (avatar or initials). */
export function competitionTeamEmailFooterHtml(input: {
  people: CompetitionTeamFooterPerson[];
  /** Competition logo URL (e.g. from WCA information). Omit when unavailable. */
  logoUrl?: string | null;
  competitionName?: string | null;
}) {
  const { navy, soft, white, fontStack } = AMS_EMAIL;
  const people = input.people.filter((person) => person.name.trim());
  const logoUrl = input.logoUrl?.trim() || null;
  const logoAlt = escapeHtml(
    input.competitionName?.trim() || "Logo de la competencia",
  );

  const logoCell = logoUrl
    ? `<td valign="middle" style="padding:8px 16px 8px 0;">
  <img src="${escapeHtml(logoUrl)}" alt="${logoAlt}" width="56" height="56" style="display:block;width:56px;height:56px;border:0;object-fit:contain;"/>
</td>`
    : "";

  const personCells = people
    .map((person) => {
      const roleLabel =
        person.role === "delegado" ? "DELEGADO" : "ORGANIZADOR";
      const avatar = person.image?.trim()
        ? `<img src="${escapeHtml(person.image.trim())}" alt="" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:50%;border:0;object-fit:cover;"/>`
        : `<div style="width:48px;height:48px;border-radius:50%;background-color:${navy};color:${white};font-family:${fontStack};font-size:14px;font-weight:700;line-height:48px;text-align:center;">${escapeHtml(footerInitials(person.name))}</div>`;

      return `<td valign="top" align="center" style="padding:8px 12px;min-width:96px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
    <tr><td align="center">${avatar}</td></tr>
    <tr><td align="center" style="padding-top:8px;font-family:${fontStack};font-size:12px;font-weight:700;line-height:1.3;color:${navy};">${escapeHtml(person.name.trim())}</td></tr>
    <tr><td align="center" style="padding-top:4px;border-top:1px solid ${navy};font-family:${fontStack};font-size:10px;letter-spacing:0.04em;color:${navy};">${roleLabel}</td></tr>
  </table>
</td>`;
    })
    .join("");

  if (!personCells && !logoCell) return "";

  if (!personCells) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;padding-top:16px;border-top:1px solid #e8e8e8;">
  <tr>${logoCell}</tr>
</table>`;
  }

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;padding-top:16px;border-top:1px solid #e8e8e8;background-color:${soft};">
  <tr>
    ${logoCell}
    <td valign="middle">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>${personCells}</tr>
      </table>
    </td>
  </tr>
</table>`;
}
