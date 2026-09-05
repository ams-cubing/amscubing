import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@workspace/db", () => ({
  db: {
    query: {
      user: {
        findMany,
      },
    },
  },
}));

import { getPublicDelegates } from "@/lib/delegates";

describe("getPublicDelegates", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("maps delegate rows with defaults", async () => {
    findMany.mockResolvedValue([
      {
        name: "Ana Delegada",
        image: null,
        wcaId: "2010DEL01",
        delegateTitle: null,
        delegateLocation: null,
        region: { displayName: "Jalisco" },
      },
    ]);

    const delegates = await getPublicDelegates();

    expect(delegates).toEqual([
      {
        name: "Ana Delegada",
        wcaId: "2010DEL01",
        title: "Delegado",
        location: "Jalisco",
        avatarUrl: null,
        wcaProfileUrl: "https://www.worldcubeassociation.org/persons/2010DEL01",
      },
    ]);
    expect(findMany).toHaveBeenCalledOnce();
  });

  it("uses delegate fields when present", async () => {
    findMany.mockResolvedValue([
      {
        name: "Leo",
        image: null,
        wcaId: "2016TORO03",
        delegateTitle: "Delegado Senior",
        delegateLocation: "CDMX",
        region: { displayName: "Ciudad de México" },
      },
    ]);

    const delegates = await getPublicDelegates();

    expect(delegates[0]).toEqual({
      name: "Leo",
      wcaId: "2016TORO03",
      title: "Delegado Senior",
      location: "CDMX",
      avatarUrl:
        "https://avatars.worldcubeassociation.org/mlypawxraj938ea8ktwxscvli3ue",
      wcaProfileUrl: "https://www.worldcubeassociation.org/persons/2016TORO03",
    });
  });

  it("falls back to México when region is missing", async () => {
    findMany.mockResolvedValue([
      {
        name: "Luis",
        image: null,
        wcaId: "2018WXYZ01",
        delegateTitle: null,
        delegateLocation: null,
        region: null,
      },
    ]);

    const delegates = await getPublicDelegates();

    expect(delegates[0]?.location).toBe("México");
  });

  it("returns the public WordPress fallback when the database is unavailable", async () => {
    findMany.mockRejectedValue(new Error("missing database"));

    const delegates = await getPublicDelegates();

    expect(delegates[0]).toMatchObject({
      name: "Areli Rubí Gordillo Martínez",
      wcaId: "2014MART08",
      avatarUrl:
        "https://avatars.worldcubeassociation.org/uploads/user/avatar/2014MART08/1496807672_thumb.JPG",
    });
  });
});
