import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, selectLimit, mergeUserIntoStub } = vi.hoisted(() => {
  const findFirst = vi.fn();
  const selectLimit = vi.fn();
  const mergeUserIntoStub = vi.fn();
  return { findFirst, selectLimit, mergeUserIntoStub };
});

vi.mock("@workspace/db", () => ({
  db: {
    query: {
      user: {
        findFirst,
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: selectLimit,
          })),
        })),
      })),
    })),
  },
}));

vi.mock("@workspace/db/schema", () => ({
  account: {
    providerId: "provider_id",
    accountId: "account_id",
    userId: "user_id",
  },
  user: {
    id: "id",
    email: "email",
    wcaId: "wca_id",
    emailVerified: "email_verified",
  },
}));

vi.mock("./merge-wca-user", () => ({
  mergeUserIntoStub,
}));

import { WcaEmailCollisionError } from "./claim-wca-stub";
import {
  mergeEarlierUsersIntoWcaStub,
  stubNeedsWcaEmailClaim,
} from "./reconcile-wca-stub";

describe("mergeEarlierUsersIntoWcaStub", () => {
  beforeEach(() => {
    findFirst.mockReset();
    selectLimit.mockReset();
    mergeUserIntoStub.mockReset();
    selectLimit.mockResolvedValue([]);
  });

  it("merges an email/password account that owns the WCA email", async () => {
    findFirst.mockResolvedValue({
      id: "password-user",
      email: "isaac@example.com",
      emailVerified: true,
      wcaId: null,
    });

    await mergeEarlierUsersIntoWcaStub({
      stubId: "stub-id",
      stubWcaId: "2018CAST17",
      wcaAccountId: "123",
      email: "Isaac@example.com",
    });

    expect(mergeUserIntoStub).toHaveBeenCalledWith("password-user", "stub-id");
  });

  it("merges a prior WCA OAuth row that still has no WCA ID", async () => {
    selectLimit.mockResolvedValue([{ id: "earlier-wca-user" }]);
    findFirst.mockResolvedValue(undefined);

    await mergeEarlierUsersIntoWcaStub({
      stubId: "stub-id",
      stubWcaId: "2018CAST17",
      wcaAccountId: "123",
      email: "isaac@example.com",
    });

    expect(mergeUserIntoStub).toHaveBeenCalledWith(
      "earlier-wca-user",
      "stub-id",
    );
  });

  it("throws when the email belongs to a different WCA ID", async () => {
    findFirst.mockResolvedValue({
      id: "other-user",
      email: "taken@example.com",
      emailVerified: true,
      wcaId: "2019OTHER01",
    });

    await expect(
      mergeEarlierUsersIntoWcaStub({
        stubId: "stub-id",
        stubWcaId: "2018CAST17",
        wcaAccountId: "123",
        email: "taken@example.com",
      }),
    ).rejects.toBeInstanceOf(WcaEmailCollisionError);

    expect(mergeUserIntoStub).not.toHaveBeenCalled();
  });

  it("requires email verification before merging a non-placeholder account", async () => {
    findFirst.mockResolvedValue({
      id: "unverified-user",
      email: "pending@example.com",
      emailVerified: false,
      wcaId: null,
    });

    await expect(
      mergeEarlierUsersIntoWcaStub({
        stubId: "stub-id",
        stubWcaId: "2018CAST17",
        wcaAccountId: "123",
        email: "pending@example.com",
      }),
    ).rejects.toThrow(/Verifica tu correo AMS/);

    expect(mergeUserIntoStub).not.toHaveBeenCalled();
  });
});

describe("stubNeedsWcaEmailClaim", () => {
  it("is true for placeholder emails and mismatches", () => {
    expect(
      stubNeedsWcaEmailClaim("2018CAST17@ams.placeholder", "a@example.com"),
    ).toBe(true);
    expect(stubNeedsWcaEmailClaim("old@example.com", "new@example.com")).toBe(
      true,
    );
  });

  it("is false when the stub already has the WCA email", () => {
    expect(stubNeedsWcaEmailClaim("A@example.com", "a@example.com")).toBe(
      false,
    );
  });
});
