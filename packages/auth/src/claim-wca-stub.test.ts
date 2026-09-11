import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, update, set, where, returning } = vi.hoisted(() => {
  const returning = vi.fn();
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  const findFirst = vi.fn();
  return { findFirst, update, set, where, returning };
});

vi.mock("@workspace/db", () => ({
  db: {
    query: {
      user: {
        findFirst,
      },
    },
    update,
  },
}));

vi.mock("@workspace/db/schema", () => ({
  user: {
    id: "id",
    email: "email",
    wcaId: "wca_id",
    role: "role",
    regionId: "region_id",
    delegateTitle: "delegate_title",
    delegateLocation: "delegate_location",
    name: "name",
    image: "image",
    emailVerified: "email_verified",
    lastLogin: "last_login",
    updatedAt: "updated_at",
  },
}));

import {
  claimWcaStubUser,
  WcaEmailCollisionError,
  type ClaimableUser,
} from "./claim-wca-stub";

const stubUser: ClaimableUser = {
  id: "stub-id",
  email: "2022MUNG01@ams.placeholder",
  wcaId: "2022MUNG01",
  role: "user",
  regionId: null,
  delegateTitle: null,
  delegateLocation: null,
  name: "Oscar Isaac Corona Munguía",
  image: "https://example.com/old.jpg",
};

describe("claimWcaStubUser", () => {
  beforeEach(() => {
    findFirst.mockReset();
    update.mockClear();
    set.mockClear();
    where.mockClear();
    returning.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("claims a placeholder stub by updating email, name, and image", async () => {
    findFirst.mockResolvedValue(undefined);
    returning.mockResolvedValue([
      {
        ...stubUser,
        email: "hechodelego@gmail.com",
        name: "Oscar Isaac Corona Munguía",
        image: "https://example.com/new.jpg",
        role: "user",
      },
    ]);

    const claimed = await claimWcaStubUser(stubUser, {
      email: "HechoDeLego@gmail.com",
      name: "Oscar Isaac Corona Munguía",
      image: "https://example.com/new.jpg",
      role: "user",
    });

    expect(findFirst).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "hechodelego@gmail.com",
        name: "Oscar Isaac Corona Munguía",
        image: "https://example.com/new.jpg",
        emailVerified: true,
        role: "user",
      }),
    );
    expect(claimed.email).toBe("hechodelego@gmail.com");
    expect(claimed.image).toBe("https://example.com/new.jpg");
  });

  it("still updates profile fields when email already matches (no collision check)", async () => {
    returning.mockResolvedValue([
      {
        ...stubUser,
        email: "hechodelego@gmail.com",
        image: "https://example.com/new.jpg",
        role: "editor",
      },
    ]);

    const claimed = await claimWcaStubUser(
      { ...stubUser, email: "hechodelego@gmail.com" },
      {
        email: "hechodelego@gmail.com",
        name: "Oscar Isaac Corona Munguía",
        image: "https://example.com/new.jpg",
        role: "editor",
      },
    );

    expect(findFirst).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "hechodelego@gmail.com",
        role: "editor",
        emailVerified: true,
      }),
    );
    expect(claimed.role).toBe("editor");
  });

  it("throws when the real email already belongs to another user", async () => {
    findFirst.mockResolvedValue({ id: "other-user-id" });

    await expect(
      claimWcaStubUser(stubUser, {
        email: "taken@gmail.com",
        name: "Oscar Isaac Corona Munguía",
        role: "user",
      }),
    ).rejects.toBeInstanceOf(WcaEmailCollisionError);

    expect(update).not.toHaveBeenCalled();
  });

  it("preserves delegate metadata from the stub when claiming", async () => {
    findFirst.mockResolvedValue(undefined);
    returning.mockResolvedValue([
      {
        ...stubUser,
        email: "delegate@example.com",
        role: "delegate",
        regionId: "OCC",
        delegateTitle: "Delegado Junior",
        delegateLocation: "Jalisco",
      },
    ]);

    await claimWcaStubUser(
      {
        ...stubUser,
        role: "delegate",
        regionId: "OCC",
        delegateTitle: "Delegado Junior",
        delegateLocation: "Jalisco",
      },
      {
        email: "delegate@example.com",
        name: "Delegate Name",
        role: "delegate",
        regionId: "OCC",
        delegateTitle: "Delegado Junior",
        delegateLocation: "Jalisco",
      },
    );

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "delegate",
        regionId: "OCC",
        delegateTitle: "Delegado Junior",
        delegateLocation: "Jalisco",
      }),
    );
  });
});
