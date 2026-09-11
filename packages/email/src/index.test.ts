import { describe, expect, it } from "vitest";

import {
  competitionStatusChangedEmail,
  delegateAssignedEmail,
  delegateRemovedEmail,
  isDeliverableEmail,
  organizerAssignedEmail,
  organizerRemovedEmail,
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

  it("escapes organizer assigned template", () => {
    const html = organizerAssignedEmail({
      recipientName: "<script>",
      city: "CDMX &",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      misCompetenciasUrl: "https://example.com/?q=1",
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("CDMX &amp;");
  });

  it("escapes organizer removed template", () => {
    const html = organizerRemovedEmail({
      recipientName: "A<b>",
      city: "City",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      misCompetenciasUrl: "https://example.com",
    });

    expect(html).toContain("A&lt;b&gt;");
  });

  it("escapes competition status changed template", () => {
    const html = competitionStatusChangedEmail({
      recipientName: "Ana",
      city: "León & Co",
      statusLabel: 'Anunciada "ya"',
      misCompetenciasUrl: "https://example.com",
    });

    expect(html).toContain("León &amp; Co");
    expect(html).toContain("Anunciada &quot;ya&quot;");
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
