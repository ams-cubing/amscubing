import {
  boardNotificationEmail,
  competitionStatusChangedEmail,
  competitionStatusChangedSubject,
  isDeliverableEmail,
  sendEmail,
} from "@workspace/email";

import { getCalendarUrl } from "@/lib/urls";

export async function sendBoardNotificationEmail(input: {
  to: string;
  recipientName: string;
  subject: string;
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  if (!isDeliverableEmail(input.to)) return;

  await sendEmail({
    to: input.to,
    subject: input.subject,
    html: boardNotificationEmail({
      recipientName: input.recipientName,
      title: input.title,
      bodyHtml: input.bodyHtml,
      ctaLabel: input.ctaLabel,
      ctaHref: input.ctaHref,
    }),
  });
}

export async function sendCompetitionStatusChangedEmail(input: {
  to: string;
  recipientName: string;
  city: string;
  statusLabel: string;
}) {
  if (!isDeliverableEmail(input.to)) return;

  const misCompetenciasUrl = `${getCalendarUrl().replace(/\/$/, "")}/mis-competencias`;

  await sendEmail({
    to: input.to,
    subject: competitionStatusChangedSubject(input),
    html: competitionStatusChangedEmail({
      recipientName: input.recipientName,
      city: input.city,
      statusLabel: input.statusLabel,
      misCompetenciasUrl,
    }),
  });
}
