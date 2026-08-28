import {
  boardNotificationEmail,
  isDeliverableEmail,
  sendEmail,
} from "@workspace/email";

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
