export function canManageBlog(role: string, staff?: string | null) {
  return (
    role === "delegate" ||
    ["administrator", "developer", "editor"].includes(staff ?? "")
  );
}
