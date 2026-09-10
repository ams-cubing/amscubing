export type AmsRole = "delegate" | "user" | "editor";

/**
 * Resolve AMS auth role from WCA profile + existing DB row.
 * Promotes when WCA reports a delegate status; never auto-demotes a
 * seeded/existing AMS delegate (manual demotion only). Preserves the
 * editorial `editor` role across login when the user is not a WCA delegate.
 */
export function resolveWcaRole(input: {
  delegateStatus: string | null | undefined;
  existingRole: string | null | undefined;
}): AmsRole {
  if (input.delegateStatus) {
    return "delegate";
  }

  if (input.existingRole === "delegate") {
    return "delegate";
  }

  if (input.existingRole === "editor") {
    return "editor";
  }

  return "user";
}
