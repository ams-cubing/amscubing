import {
  dateRequestDelegateEmail,
  dateRequestDelegateSubject,
  dateRequestOrganizerEmail,
  dateRequestOrganizerSubject,
  delegateAssignedEmail,
  delegateAssignedSubject,
  delegateRemovedEmail,
  delegateRemovedSubject,
  isDeliverableEmail,
  sendEmail,
  ultimatumEmail,
  ultimatumSubject,
} from "@workspace/email";

function panelUrl() {
  return `${process.env.BETTER_AUTH_URL}/panel`;
}

function misCompetenciasUrl() {
  return `${process.env.BETTER_AUTH_URL}/mis-competencias`;
}

export async function sendDelegateAssignedEmail(input: {
  to: string;
  recipientName: string;
  city: string;
  startDate: string;
  endDate: string;
}) {
  if (!isDeliverableEmail(input.to)) return;

  await sendEmail({
    to: input.to,
    subject: delegateAssignedSubject(input),
    html: delegateAssignedEmail({
      recipientName: input.recipientName,
      city: input.city,
      startDate: input.startDate,
      endDate: input.endDate,
      panelUrl: panelUrl(),
    }),
  });
}

export async function sendDelegateRemovedEmail(input: {
  to: string;
  recipientName: string;
  city: string;
  startDate: string;
  endDate: string;
}) {
  if (!isDeliverableEmail(input.to)) return;

  await sendEmail({
    to: input.to,
    subject: delegateRemovedSubject(input),
    html: delegateRemovedEmail({
      recipientName: input.recipientName,
      city: input.city,
      startDate: input.startDate,
      endDate: input.endDate,
      panelUrl: panelUrl(),
    }),
  });
}

export async function sendUltimatumEmail(input: {
  to: string;
  deadline: Date;
  message?: string;
}) {
  if (!isDeliverableEmail(input.to)) return;

  await sendEmail({
    to: input.to,
    subject: ultimatumSubject,
    html: ultimatumEmail({
      deadline: input.deadline,
      message: input.message,
    }),
  });
}

export async function sendDateRequestDelegateEmail(input: {
  to: string;
  delegateName: string;
  city: string;
  startDate: string;
  endDate: string;
}) {
  if (!isDeliverableEmail(input.to)) return;

  await sendEmail({
    to: input.to,
    subject: dateRequestDelegateSubject(input),
    html: dateRequestDelegateEmail({
      delegateName: input.delegateName,
      city: input.city,
      startDate: input.startDate,
      endDate: input.endDate,
      panelUrl: panelUrl(),
    }),
  });
}

export async function sendDateRequestOrganizerEmail(input: {
  to: string;
  organizerName: string;
  city: string;
  startDate: string;
  endDate: string;
  delegateName: string | null;
  delegateEmail: string | null;
}) {
  if (!isDeliverableEmail(input.to)) return;

  await sendEmail({
    to: input.to,
    subject: dateRequestOrganizerSubject(input),
    html: dateRequestOrganizerEmail({
      organizerName: input.organizerName,
      city: input.city,
      startDate: input.startDate,
      endDate: input.endDate,
      delegateName: input.delegateName,
      delegateEmail: input.delegateEmail,
      misCompetenciasUrl: misCompetenciasUrl(),
    }),
  });
}
