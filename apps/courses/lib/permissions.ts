export function canManageCourses(role: string, staffRole?: string | null) {
  return (
    role === "delegate" ||
    ["administrator", "developer", "instructor"].includes(staffRole ?? "")
  );
}
