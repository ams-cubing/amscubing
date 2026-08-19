import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, insert, update, del, revalidatePath } = vi.hoisted(() => ({
  getSession: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession,
    },
  },
}));

vi.mock("@workspace/db", () => ({
  db: {
    insert,
    update,
    delete: del,
  },
}));

vi.mock("@workspace/db/schema", () => ({
  holidays: { id: "id" },
}));

import {
  createHoliday,
  deleteHoliday,
  updateHoliday,
} from "@/app/panel/feriados/_actions/holiday-actions";

const holidayInput = {
  name: "Año Nuevo",
  date: "2026-01-01",
  official: true,
};

describe("holiday actions authz", () => {
  beforeEach(() => {
    getSession.mockReset();
    insert.mockReset();
    update.mockReset();
    del.mockReset();
    revalidatePath.mockReset();
  });

  it("createHoliday rejects non-delegates", async () => {
    getSession.mockResolvedValue({
      user: { id: "u1", role: "user" },
    });

    const result = await createHoliday(holidayInput);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Solo delegados pueden realizar esta acción");
    expect(insert).not.toHaveBeenCalled();
  });

  it("updateHoliday rejects non-delegates", async () => {
    getSession.mockResolvedValue({
      user: { id: "u1", role: "user" },
    });

    const result = await updateHoliday(1, holidayInput);

    expect(result.success).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("deleteHoliday rejects non-delegates", async () => {
    getSession.mockResolvedValue({
      user: { id: "u1", role: "user" },
    });

    const result = await deleteHoliday(1);

    expect(result.success).toBe(false);
    expect(del).not.toHaveBeenCalled();
  });

  it("createHoliday inserts for delegates", async () => {
    getSession.mockResolvedValue({
      user: { id: "d1", role: "delegate" },
    });
    insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const result = await createHoliday(holidayInput);

    expect(result).toEqual({ success: true, message: "Feriado creado" });
    expect(insert).toHaveBeenCalled();
  });
});
