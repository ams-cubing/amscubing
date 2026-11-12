export const STAFF_ACTIVITIES = [
  "judge",
  "scrambler",
  "runner",
  "registration",
  "data_entry",
] as const;

export type StaffActivity = (typeof STAFF_ACTIVITIES)[number];

export const STAFF_ACTIVITY_LABELS: Record<StaffActivity, string> = {
  judge: "Juez",
  scrambler: "Mezclador",
  runner: "Corredor",
  registration: "Registro",
  data_entry: "Capturista",
};

export type StaffCourseStatus =
  | "completed"
  | "in_progress"
  | "not_enrolled"
  | "no_account";

export const STAFF_COURSE_STATUS_LABELS: Record<StaffCourseStatus, string> = {
  completed: "Completó el curso",
  in_progress: "Curso en progreso",
  not_enrolled: "No ha iniciado el curso",
  no_account: "Sin cuenta AMS",
};

export function isStaffActivity(value: string): value is StaffActivity {
  return (STAFF_ACTIVITIES as readonly string[]).includes(value);
}
