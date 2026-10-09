export function canManageBlog(role: string, staff?: string | null) {
  return (
    role === "delegate" ||
    ["administrator", "developer", "editor"].includes(staff ?? "")
  );
}
export function canManageStaff(staff?: string | null) {
  return ["administrator", "developer"].includes(staff ?? "");
}
