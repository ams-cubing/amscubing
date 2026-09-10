/**
 * Resolve AMS auth role from WCA profile + existing DB row.
 * Promotes when WCA reports a delegate status; never auto-demotes a
 * seeded/existing AMS delegate (manual demotion only).
 */
export function resolveWcaRole(input: {
  delegateStatus: string | null | undefined;
  existingRole: string | null | undefined;
}): "delegate" | "user" {
  if (input.delegateStatus) {
    return "delegate";
  }

  if (input.existingRole === "delegate") {
    return "delegate";
  }

  return "user";
}
