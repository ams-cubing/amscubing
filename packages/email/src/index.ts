import { Resend } from "resend";

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
  return `
    <p>Hola ${escapeHtml(name)},</p>
    <p><strong>${escapeHtml(input.title)}</strong></p>
    ${input.bodyHtml}
    <p><a href="${escapeHtml(input.ctaHref)}">${escapeHtml(input.ctaLabel)}</a></p>
    <p>Saludos,<br/>Equipo de la Asociación Mexicana de Speedcubing</p>
  `;
}

export function delegateAssignedEmail(input: {
  recipientName: string;
  city: string;
  startDate: string;
  endDate: string;
  panelUrl: string;
}) {
  return `
    <p>Hola ${escapeHtml(input.recipientName)},</p>
    <p>Has sido asignado como delegado para una competencia en ${escapeHtml(input.city)} (${escapeHtml(input.startDate)} - ${escapeHtml(input.endDate)}).</p>
    <p><a href="${escapeHtml(input.panelUrl)}">Revisa el panel de competencias para más detalles</a></p>
  `;
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
  return `
    <p>Hola ${escapeHtml(input.recipientName)},</p>
    <p>Has sido removido como delegado de una competencia en ${escapeHtml(input.city)} (${escapeHtml(input.startDate)} - ${escapeHtml(input.endDate)}).</p>
    <p><a href="${escapeHtml(input.panelUrl)}">Revisa el panel de competencias para más detalles</a></p>
  `;
}

export function delegateRemovedSubject(input: {
  city: string;
  startDate: string;
  endDate: string;
}) {
  return `Remoción como delegado: ${input.city} (${input.startDate} - ${input.endDate})`;
}

export function ultimatumEmail(input: {
  deadline: Date;
  message?: string;
}) {
  const body =
    input.message?.trim() ||
    "Por favor, asegúrate de cumplir con los requisitos antes de la fecha límite.";
  return `
    <p>Hola,</p>
    <p>Se ha enviado un ultimátum para una de tus competencias.</p>
    <p>Fecha límite: ${escapeHtml(input.deadline.toLocaleDateString())}</p>
    <p>${escapeHtml(body)}</p>
    <p>Saludos,</p>
    <p>Equipo de la Asociación Mexicana de Speedcubing</p>
  `;
}

export const ultimatumSubject = "Ultimátum enviado para tu competencia";

export function dateRequestDelegateEmail(input: {
  delegateName: string;
  city: string;
  startDate: string;
  endDate: string;
  panelUrl: string;
}) {
  return `
    <p>Hola ${escapeHtml(input.delegateName)},</p>
    <p>Se te ha asignado como delegado para la competencia en ${escapeHtml(input.city)} (${escapeHtml(input.startDate)} - ${escapeHtml(input.endDate)}).</p>
    <p><a href="${escapeHtml(input.panelUrl)}">Mira los detalles en el panel de competencias</a></p>
  `;
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
  return `
    <p>Hola ${escapeHtml(input.organizerName)},</p>
    <p>Tu solicitud de fecha para una competencia en ${escapeHtml(input.city)} (${escapeHtml(input.startDate)} - ${escapeHtml(input.endDate)}) ha sido creada exitosamente.</p>
    <p>El delegado asignado es: ${escapeHtml(input.delegateName ?? "Aún no se ha asignado un delegado")}</p>
    <p>Puedes contactarlo en: ${escapeHtml(input.delegateEmail ?? "Pendiente")}</p>
    <p><a href="${escapeHtml(input.misCompetenciasUrl)}">Revisa los detalles aquí</a></p>
  `;
}

export function dateRequestOrganizerSubject(input: {
  city: string;
  startDate: string;
  endDate: string;
}) {
  return `Fecha solicitada en ${input.city} (${input.startDate} - ${input.endDate})`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
