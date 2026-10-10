import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  securityHeaders,
} from "./security-headers.mjs";

function header(headers: { key: string; value: string }[], key: string) {
  return headers.find((h) => h.key === key)?.value;
}

describe("securityHeaders", () => {
  it("enforces frame, sniffing and referrer headers", () => {
    const headers = securityHeaders({ isProduction: false });
    expect(header(headers, "X-Frame-Options")).toBe("DENY");
    expect(header(headers, "X-Content-Type-Options")).toBe("nosniff");
    expect(header(headers, "Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("ships CSP as report-only, never enforced", () => {
    const headers = securityHeaders({ isProduction: true });
    expect(header(headers, "Content-Security-Policy")).toBeUndefined();
    expect(header(headers, "Content-Security-Policy-Report-Only")).toContain(
      "frame-ancestors 'none'",
    );
  });

  it("only sends HSTS in production", () => {
    expect(
      header(
        securityHeaders({ isProduction: false }),
        "Strict-Transport-Security",
      ),
    ).toBeUndefined();
    expect(
      header(
        securityHeaders({ isProduction: true }),
        "Strict-Transport-Security",
      ),
    ).toContain("max-age=");
  });
});

describe("buildContentSecurityPolicy", () => {
  it("allows eval only in development", () => {
    expect(buildContentSecurityPolicy({ isProduction: false })).toContain(
      "'unsafe-eval'",
    );
    expect(buildContentSecurityPolicy({ isProduction: true })).not.toContain(
      "'unsafe-eval'",
    );
  });

  it("appends extra connect sources", () => {
    const csp = buildContentSecurityPolicy({
      isProduction: true,
      extraConnectSrc: ["https://api.cubingmexico.net"],
    });
    expect(csp).toMatch(/connect-src [^;]*https:\/\/api\.cubingmexico\.net/);
  });
});
