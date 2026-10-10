import { describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({ db: { execute: vi.fn() } }));

import { consumeRateLimit } from "./rate-limit";

const options = { key: "test:k", windowMs: 60_000, max: 3 };

function executorReturning(count: unknown) {
  return { execute: vi.fn().mockResolvedValue([{ count }]) };
}

describe("consumeRateLimit", () => {
  it("allows up to max", async () => {
    const executor = executorReturning(3);
    const result = await consumeRateLimit(options, executor as never);
    expect(result).toEqual({ allowed: true, count: 3 });
    expect(executor.execute).toHaveBeenCalledTimes(1);
  });

  it("blocks above max", async () => {
    const result = await consumeRateLimit(
      options,
      executorReturning(4) as never,
    );
    expect(result).toEqual({ allowed: false, count: 4 });
  });

  it("parses counts returned as strings", async () => {
    const result = await consumeRateLimit(
      options,
      executorReturning("2") as never,
    );
    expect(result).toEqual({ allowed: true, count: 2 });
  });
});
