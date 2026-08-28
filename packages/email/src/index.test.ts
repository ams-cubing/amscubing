import { describe, expect, it } from "vitest";

import {
  delegateAssignedEmail,
  delegateRemovedEmail,
  isDeliverableEmail,
  sendEmail,
  ultimatumEmail,
} from "./index";

describe("isDeliverableEmail", () => {
  it("rejects placeholder addresses", () => {
    expect(isDeliverableEmail("2020TEST01@ams.placeholder")).toBe(false);
  });

  it("accepts real addresses", () => {
    expect(isDeliverableEmail("user@example.com")).toBe(true);
  });
});

describe("email templates escape HTML", () => {
  it("escapes delegate assigned template", () => {
    const html = delegateAssignedEmail({
      recipientName: "<script>",
      city: "CDMX &",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      panelUrl: "https://example.com/?q=1",
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("CDMX &amp;");
  });

  it("escapes delegate removed template", () => {
    const html = delegateRemovedEmail({
      recipientName: "A<b>",
      city: "City",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      panelUrl: "https://example.com",
    });

    expect(html).toContain("A&lt;b&gt;");
  });

  it("escapes ultimatum message", () => {
    const html = ultimatumEmail({
      deadline: new Date("2026-06-15"),
      message: 'Use "quotes" & symbols',
    });

    expect(html).toContain("&quot;quotes&quot;");
    expect(html).toContain("&amp; symbols");
  });
});

describe("sendEmail", () => {
  it("skips send when RESEND_API_KEY is unset", async () => {
    const original = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const result = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hi</p>",
    });

    expect(result).toEqual({ ok: false, reason: "missing_api_key" });

    if (original) {
      process.env.RESEND_API_KEY = original;
    }
  });
});
