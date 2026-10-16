export const DECLINE_REASON_MAX_LENGTH = 1000;

export function parseDeclineReason(
  reason: string | null | undefined,
): { ok: true; reason: string } | { ok: false; message: string } {
  const trimmed = reason?.trim() ?? "";
  if (!trimmed) {
    return {
      ok: false,
      message: "Escribe el motivo del rechazo para el organizador",
    };
  }
  if (trimmed.length > DECLINE_REASON_MAX_LENGTH) {
    return {
      ok: false,
      message: `El motivo no puede superar ${DECLINE_REASON_MAX_LENGTH} caracteres`,
    };
  }
  return { ok: true, reason: trimmed };
}
