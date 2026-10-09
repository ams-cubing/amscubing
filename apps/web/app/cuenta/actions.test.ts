import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  member: null as any,
  rows: [] as any[],
  update: vi.fn(),
  insert: vi.fn(),
  remove: vi.fn(),
  unlink: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: async () => (state.member ? { user: state.member } : null),
      unlinkAccount: state.unlink,
    },
  },
}));
vi.mock("@workspace/db", () => {
  const database: any = {
    select: () => ({
      from: () => ({ where: async () => state.rows.shift() ?? [] }),
    }),
    update: (...args: any[]) => {
      state.update(...args);
      return {
        set: (values: any) => {
          state.update(values);
          return { where: async () => {} };
        },
      };
    },
    insert: (...args: any[]) => {
      state.insert(...args);
      return {
        values: (values: any) => {
          state.insert(values);
          return { onConflictDoUpdate: async () => {} };
        },
      };
    },
    delete: state.remove,
    transaction: async (callback: any) => {
      state.transaction();
      return callback(database);
    },
    execute: async () => {},
  };
  return { db: database };
});
import { saveProfile, setPermission, unlinkWca } from "./actions";
const initial = { ok: false, message: "" };
function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
function signedIn(role = "user") {
  state.member = { id: "actor", role, emailVerified: true };
  state.rows.push([state.member]);
}
beforeEach(() => {
  state.member = null;
  state.rows = [];
  vi.clearAllMocks();
});
describe("Perfil: autorización en el servidor", () => {
  it("rechaza edición anónima", async () => {
    expect((await saveProfile(initial, form({ name: "Nombre" }))).ok).toBe(
      false,
    );
    expect(state.transaction).not.toHaveBeenCalled();
  });
  it("guarda solo los campos de perfil y no acepta roles ni identidades del formulario", async () => {
    signedIn();
    expect(
      (
        await saveProfile(
          initial,
          form({
            name: "Nombre Nuevo",
            city: "México",
            biography: "Cubero",
            role: "delegate",
            userId: "victim",
            wcaId: "forged",
          }),
        )
      ).ok,
    ).toBe(true);
    expect(state.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Nombre Nuevo" }),
    );
    expect(state.insert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "actor", city: "México" }),
    );
    expect(
      state.update.mock.calls
        .filter(([values]) => typeof values?.name === "string")
        .every(([values]) => !values.role && !values.wcaId),
    ).toBe(true);
  });
  it("un administrador de Blog no puede gestionar Cursos", async () => {
    signedIn();
    state.rows.push([]);
    expect(
      (
        await setPermission(
          initial,
          form({
            scope: "courses",
            role: "administrator",
            email: "target@example.com",
          }),
        )
      ).ok,
    ).toBe(false);
    expect(state.transaction).not.toHaveBeenCalled();
  });
  it("un editor no puede conceder permisos", async () => {
    signedIn();
    state.rows.push([{ role: "editor" }]);
    expect(
      (
        await setPermission(
          initial,
          form({
            scope: "blog",
            role: "developer",
            email: "target@example.com",
          }),
        )
      ).ok,
    ).toBe(false);
    expect(state.transaction).not.toHaveBeenCalled();
  });
  it("impide modificar los propios permisos", async () => {
    signedIn();
    state.rows.push(
      [{ role: "developer" }],
      [{ id: "actor", emailVerified: true }],
    );
    expect(
      (
        await setPermission(
          initial,
          form({ scope: "blog", role: "none", email: "actor@example.com" }),
        )
      ).ok,
    ).toBe(false);
    expect(state.transaction).not.toHaveBeenCalled();
  });
  it("rechaza niveles que corresponden a otra aplicación", async () => {
    signedIn("delegate");
    expect(
      (
        await setPermission(
          initial,
          form({ scope: "courses", role: "editor", email: "x@example.com" }),
        )
      ).ok,
    ).toBe(false);
  });
  it("requiere correo verificado en el destinatario", async () => {
    signedIn("delegate");
    state.rows.push([], [{ id: "target", emailVerified: false }]);
    expect(
      (
        await setPermission(
          initial,
          form({ scope: "blog", role: "editor", email: "x@example.com" }),
        )
      ).ok,
    ).toBe(false);
  });
  it("no desvincula WCA cuando es el único método de acceso", async () => {
    signedIn();
    state.rows.push([]);
    expect((await unlinkWca()).ok).toBe(false);
    expect(state.unlink).not.toHaveBeenCalled();
  });
  it("rechaza permisos revocados mientras la solicitud esperaba", async () => {
    signedIn();
    state.rows.push(
      [{ role: "developer" }],
      [{ id: "target", emailVerified: true }],
      [state.member],
      [],
    );
    expect(
      (
        await setPermission(
          initial,
          form({ scope: "blog", role: "editor", email: "x@example.com" }),
        )
      ).ok,
    ).toBe(false);
    expect(state.insert).not.toHaveBeenCalled();
  });
  it("concede permisos de Blog y registra el cambio en una transacción", async () => {
    signedIn();
    state.rows.push(
      [{ role: "developer" }],
      [{ id: "target", emailVerified: true }],
      [state.member],
      [{ role: "developer" }],
      [],
    );
    expect(
      (
        await setPermission(
          initial,
          form({ scope: "blog", role: "editor", email: "x@example.com" }),
        )
      ).ok,
    ).toBe(true);
    expect(state.insert).toHaveBeenCalledWith({
      userId: "target",
      role: "editor",
    });
    expect(state.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "actor",
        targetId: "target",
        scope: "blog",
        previousRole: null,
        nextRole: "editor",
      }),
    );
  });
});
