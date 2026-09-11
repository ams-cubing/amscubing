import { Resend } from "resend";

import { emailParagraph, renderEmailLayout } from "./layout";

export { AMS_EMAIL, renderEmailLayout } from "./layout";

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

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set; skipping email send");
    return { ok: false as const, reason: "missing_api_key" as const };
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    return { ok: true as const };
  } catch (err) {
    console.error("Error sending email via Resend:", err);
    return { ok: false as const, reason: "send_failed" as const };
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
    previewText: `Nueva asignación: ${input.city}`,
    bodyHtml: [
      emailParagraph(`Hola ${escapeHtml(input.delegateName)},`),
      emailParagraph(
        `Se te ha asignado como delegado para la competencia en ${escapeHtml(input.city)} (${escapeHtml(input.startDate)} - ${escapeHtml(input.endDate)}).`,
      ),
    ].join(""),
    cta: {
      label: "Mira los detalles en el panel de competencias",
      href: input.panelUrl,
    },
  });
}

export function dateRequestDelegateSubject(input: {
  city: string;
  startDate: string;
  endDate: string;
}) {
  return `Nueva asignación: ${input.city} (${input.startDate} - ${input.endDate})`;
}

export function dateRequestOrganizerEmail(input: {
  organizerName: string;
  city: string;
  startDate: string;
  endDate: string;
  delegateName: string | null;
  delegateEmail: string | null;
  misCompetenciasUrl: string;
}) {
  return renderEmailLayout({
    previewText: `Fecha solicitada en ${input.city}`,
    bodyHtml: [
      emailParagraph(`Hola ${escapeHtml(input.organizerName)},`),
      emailParagraph(
        `Tu solicitud de fecha para una competencia en ${escapeHtml(input.city)} (${escapeHtml(input.startDate)} - ${escapeHtml(input.endDate)}) ha sido creada exitosamente.`,
      ),
      emailParagraph(
        `El delegado asignado es: ${escapeHtml(input.delegateName ?? "Aún no se ha asignado un delegado")}`,
      ),
      emailParagraph(
        `Puedes contactarlo en: ${escapeHtml(input.delegateEmail ?? "Pendiente")}`,
      ),
    ].join(""),
    cta: {
      label: "Revisa los detalles aquí",
      href: input.misCompetenciasUrl,
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

export function organizerAssignedEmail(input: {
  recipientName: string;
  city: string;
  startDate: string;
  endDate: string;
  misCompetenciasUrl: string;
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
      href: input.misCompetenciasUrl,
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
  misCompetenciasUrl: string;
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
      href: input.misCompetenciasUrl,
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
  misCompetenciasUrl: string;
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
      href: input.misCompetenciasUrl,
    },
  });
}

export function competitionStatusChangedSubject(input: {
  city: string;
  statusLabel: string;
}) {
  return `Estatus: ${input.statusLabel} — ${input.city}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
