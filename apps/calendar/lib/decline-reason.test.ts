import { describe, expect, it } from "vitest";

import {
  DECLINE_REASON_MAX_LENGTH,
  parseDeclineReason,
} from "./decline-reason";

describe("parseDeclineReason", () => {
  it("rejects empty or whitespace-only reasons", () => {
    expect(parseDeclineReason("")).toEqual({
      ok: false,
      message: "Escribe el motivo del rechazo para el organizador",
    });
    expect(parseDeclineReason("   ")).toEqual({
      ok: false,
      message: "Escribe el motivo del rechazo para el organizador",
    });
    expect(parseDeclineReason(null)).toEqual({
      ok: false,
      message: "Escribe el motivo del rechazo para el organizador",
    });
  });

  it("trims a valid reason", () => {
    expect(parseDeclineReason("  No puedo ese fin de semana  ")).toEqual({
      ok: true,
      reason: "No puedo ese fin de semana",
    });
  });

  it("rejects reasons over the max length", () => {
    const tooLong = "x".repeat(DECLINE_REASON_MAX_LENGTH + 1);
    expect(parseDeclineReason(tooLong)).toEqual({
      ok: false,
      message: `El motivo no puede superar ${DECLINE_REASON_MAX_LENGTH} caracteres`,
    });
  });
});
