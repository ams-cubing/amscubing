import {
  competitionStatusChangedEmail,
  competitionStatusChangedSubject,
  dateRequestDelegateEmail,
  dateRequestDelegateSubject,
  dateRequestOrganizerEmail,
  dateRequestOrganizerSubject,
  delegateAssignedEmail,
  delegateAssignedSubject,
  delegateRemovedEmail,
  delegateRemovedSubject,
  isDeliverableEmail,
  organizerAssignedEmail,
  organizerAssignedSubject,
  organizerRemovedEmail,
  organizerRemovedSubject,
  sendEmail,
  ultimatumEmail,
  ultimatumSubject,
} from "@workspace/email";

import { getCalendarUrl } from "@/lib/urls";

function panelUrl() {
  return `${getCalendarUrl()}/panel`;
}

function misCompetenciasUrl() {
  return `${getCalendarUrl()}/mis-competencias`;
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

export async function sendOrganizerAssignedEmail(input: {
  to: string;
  recipientName: string;
  city: string;
  startDate: string;
  endDate: string;
}) {
  if (!isDeliverableEmail(input.to)) return;

  await sendEmail({
    to: input.to,
    subject: organizerAssignedSubject(input),
    html: organizerAssignedEmail({
      recipientName: input.recipientName,
      city: input.city,
      startDate: input.startDate,
      endDate: input.endDate,
      misCompetenciasUrl: misCompetenciasUrl(),
    }),
  });
}

export async function sendOrganizerRemovedEmail(input: {
  to: string;
  recipientName: string;
  city: string;
  startDate: string;
  endDate: string;
}) {
  if (!isDeliverableEmail(input.to)) return;

  await sendEmail({
    to: input.to,
    subject: organizerRemovedSubject(input),
    html: organizerRemovedEmail({
      recipientName: input.recipientName,
      city: input.city,
      startDate: input.startDate,
      endDate: input.endDate,
      misCompetenciasUrl: misCompetenciasUrl(),
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

  await sendEmail({
    to: input.to,
    subject: competitionStatusChangedSubject(input),
    html: competitionStatusChangedEmail({
      recipientName: input.recipientName,
      city: input.city,
      statusLabel: input.statusLabel,
      misCompetenciasUrl: misCompetenciasUrl(),
    }),
  });
}
