import { afterEach, describe, expect, it, vi } from "vitest";

import { log } from "./log";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("log", () => {
  it("writes a JSON line with level, event and fields", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log.info("competition.created", { competitionId: 7 });

    const entry = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(entry).toMatchObject({
      level: "info",
      event: "competition.created",
      competitionId: 7,
    });
    expect(typeof entry.time).toBe("string");
  });

  it("serializes errors and routes them to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    log.error("email.send_failed", { error: new Error("boom") });

    const entry = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(entry.level).toBe("error");
    expect(entry.error).toMatchObject({ name: "Error", message: "boom" });
  });

  it("routes warnings to console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    log.warn("env.missing_optional", { keys: ["META_PAGE_ID"] });
    expect(spy).toHaveBeenCalledOnce();
  });
});
