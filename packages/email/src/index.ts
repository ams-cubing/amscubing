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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
