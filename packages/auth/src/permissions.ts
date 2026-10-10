export type PermissionScope = "blog" | "courses";
export function canGrantPermission(
  globalRole: string,
  scopedRole?: string | null,
) {
  return (
    globalRole === "delegate" ||
    scopedRole === "administrator" ||
    scopedRole === "developer"
  );
}
export function validScopedRole(scope: PermissionScope, role: string) {
  return [
    "none",
    "administrator",
    "developer",
    scope === "blog" ? "editor" : "instructor",
  ].includes(role);
}
export function roleLabel(role?: string | null) {
  return (
    (
      {
        administrator: "Administrador",
        developer: "Desarrollador",
        delegate: "Delegado WCA",
        editor: "Editor",
        instructor: "Instructor",
        user: "Miembro",
      } as Record<string, string>
    )[role ?? ""] ?? "Sin permiso de gestión"
  );
}
