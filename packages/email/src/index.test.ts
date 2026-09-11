import { describe, expect, it } from "vitest";

import {
  AMS_EMAIL,
  boardNotificationEmail,
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

describe("email brand layout", () => {
  it("wraps calendar templates with AMS chrome and CTA button", () => {
    const html = delegateAssignedEmail({
      recipientName: "Ana",
      city: "CDMX",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      panelUrl: "https://example.com/panel",
    });

    expect(html).toContain(AMS_EMAIL.navy);
    expect(html).toContain(AMS_EMAIL.red);
    expect(html).toContain(AMS_EMAIL.green);
    expect(html).toContain(AMS_EMAIL.logoUrl);
    expect(html).toContain(">AMS</span>");
    expect(html).toContain("Asociación Mexicana de Speedcubing");
    expect(html).toContain('href="https://example.com/panel"');
    expect(html).toContain(`background-color:${AMS_EMAIL.green}`);
    expect(html).toContain("Revisa el panel de competencias para más detalles");
  });

  it("wraps board notifications with title and CTA", () => {
    const html = boardNotificationEmail({
      recipientName: "Leo",
      title: "Nueva actividad",
      bodyHtml: "<p>Hay un comentario nuevo.</p>",
      ctaLabel: "Ver tablero",
      ctaHref: "https://example.com/board",
    });

    expect(html).toContain(AMS_EMAIL.navy);
    expect(html).toContain(AMS_EMAIL.logoUrl);
    expect(html).toContain("Nueva actividad");
    expect(html).toContain("Hay un comentario nuevo.");
    expect(html).toContain('href="https://example.com/board"');
    expect(html).toContain("Ver tablero");
    expect(html).toContain(`background-color:${AMS_EMAIL.green}`);
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
