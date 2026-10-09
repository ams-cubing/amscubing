export function canManageCourses(role: string, staffRole?: string | null) {
  return (
    role === "delegate" ||
    ["administrator", "developer", "instructor"].includes(staffRole ?? "")
  );
}
export function canManageStaff(staffRole?: string | null) {
  return ["administrator", "developer"].includes(staffRole ?? "");
}
