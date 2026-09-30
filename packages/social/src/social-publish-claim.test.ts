import { beforeEach, describe, expect, it, vi } from "vitest";

const { returning, set, where } = vi.hoisted(() => ({
  returning: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: (values: unknown) => {
        set(values);
        return {
          where: (condition: unknown) => {
            where(condition);
            return Object.assign(Promise.resolve(undefined), { returning });
          },
        };
      },
    })),
  },
}));

import {
  claimCompetitionSocialPublish,
  releaseCompetitionSocialPublish,
} from "./social-publish-claim";

describe("social publish claim", () => {
  beforeEach(() => {
    returning.mockReset();
    set.mockReset();
    where.mockReset();
  });

  it("claims when the conditional update touches the row", async () => {
    returning.mockResolvedValue([{ id: 7 }]);

    await expect(claimCompetitionSocialPublish(7)).resolves.toBe(true);
    expect(where).toHaveBeenCalledOnce();
  });

  it("refuses when another request holds a fresh claim or a post exists", async () => {
    returning.mockResolvedValue([]);

    await expect(claimCompetitionSocialPublish(7)).resolves.toBe(false);
  });

  it("clears the claim on release", async () => {
    await releaseCompetitionSocialPublish(7);

    expect(set).toHaveBeenCalledWith({ socialPublishClaimedAt: null });
  });
});
