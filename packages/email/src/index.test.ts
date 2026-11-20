import { describe, expect, it } from "vitest";

import {
  AMS_EMAIL,
  boardNotificationEmail,
  competitionBudgetSummaryTableHtml,
  competitionGroupsUrl,
  competitionIlrUrl,
  competitionInformativeMarkdownBody,
  competitionInformativeSubject,
  competitionStatusChangedEmail,
  competitionTeamEmailFooterHtml,
  competitionThankYouEmail,
  competitionThankYouSubject,
  dateRequestDeclinedOrganizerEmail,
  delegateAssignedEmail,
  delegateRemovedEmail,
  isDeliverableEmail,
  markdownEmailBodyToHtml,
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
      myCompetitionsUrl: "https://example.com/?q=1",
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
      myCompetitionsUrl: "https://example.com",
    });

    expect(html).toContain("A&lt;b&gt;");
  });

  it("escapes competition status changed template", () => {
    const html = competitionStatusChangedEmail({
      recipientName: "Ana",
      city: "León & Co",
      statusLabel: 'Anunciada "ya"',
      myCompetitionsUrl: "https://example.com",
    });

    expect(html).toContain("León &amp; Co");
    expect(html).toContain("Anunciada &quot;ya&quot;");
  });

  it("includes and escapes the decline reason for the organizer", () => {
    const html = dateRequestDeclinedOrganizerEmail({
      organizerName: "Org",
      city: "Puebla",
      startDate: "2027-02-06",
      endDate: "2027-02-07",
      nextDelegateName: null,
      reason: 'No puedo <script> ese fin & "más"',
      myCompetitionsUrl: "https://example.com/mis",
    });

    expect(html).toContain("Motivo del rechazo");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;más&quot;");
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

describe("competitionThankYouEmail", () => {
  it("builds subject, ILR link, and omits empty optional sections", () => {
    expect(
      competitionThankYouSubject({ competitionName: "UPEN Open 2026" }),
    ).toBe("UPEN Open 2026 – Agradecimiento y resultados del evento");
    expect(competitionIlrUrl("UPENOpen2026")).toBe(
      "https://www.worldcubeassociation.org/competitions/UPENOpen2026/live",
    );

    const html = competitionThankYouEmail({
      competitionName: "UPEN Open 2026",
      dateLabel: "20 de noviembre de 2026",
      placeLabel: "Pachuca, Hidalgo",
      wcaCompetitionUrl:
        "https://www.worldcubeassociation.org/competitions/UPENOpen2026",
      ilrUrl: competitionIlrUrl("UPENOpen2026"),
      sponsorNames: ["Patrocinador <X>"],
    });

    expect(html).toContain("UPEN Open 2026");
    expect(html).toContain("Patrocinador &lt;X&gt;");
    expect(html).toContain("/competitions/UPENOpen2026/live");
    expect(html).toContain("ILR");
    expect(html).not.toContain("live.worldcubeassociation.org");
    expect(html).not.toContain("Encuesta de calidad");
    expect(html).not.toContain("Reconocimientos digitales");
  });

  it("renders markdown and injects the budget table", () => {
    const table = competitionBudgetSummaryTableHtml({
      lines: [
        {
          kind: "income",
          label: "Inscripciones",
          expectedCents: 10000,
          actualCents: 12000,
        },
        {
          kind: "expense",
          label: "Sede",
          expectedCents: 5000,
          actualCents: 5000,
        },
      ],
      summary: {
        actualIncomeCents: 12000,
        actualExpenseCents: 5000,
        actualNetCents: 7000,
      },
    });
    const html = markdownEmailBodyToHtml(
      "## Hola\n\nVer [sitio](https://example.com/a)\n\n{{resumen_gastos}}",
      { budgetSummaryHtml: table },
    );
    expect(html).toContain('href="https://example.com/a"');
    expect(html).toContain("Inscripciones");
    expect(html).toContain("Remanente");
    expect(html).not.toContain("{{resumen_gastos}}");
  });
});

describe("competitionInformativeEmail", () => {
  it("seeds markdown with ILR and omits empty optionals", () => {
    expect(
      competitionInformativeSubject({ competitionName: "UPEN Open 2026" }),
    ).toBe("UPEN Open 2026 - Información previa a la competencia");
    expect(competitionGroupsUrl("UPENOpen2026")).toContain(
      "competitiongroups.com/competitions/UPENOpen2026",
    );

    const markdown = competitionInformativeMarkdownBody({
      competitionName: "UPEN Open 2026",
      dateLabel: "20 de noviembre de 2026",
      placeLabel: "Pachuca, Hidalgo",
      wcaCompetitionUrl:
        "https://www.worldcubeassociation.org/competitions/UPENOpen2026",
      ilrUrl: competitionIlrUrl("UPENOpen2026"),
      groupsUrl: competitionGroupsUrl("UPENOpen2026"),
      checkIn: "Sábado 8:00",
    });

    expect(markdown).toContain("ILR");
    expect(markdown).toContain("/competitions/UPENOpen2026/live");
    expect(markdown).not.toContain("live.worldcubeassociation.org");
    expect(markdown).toContain("**Check-in:** Sábado 8:00");
    expect(markdown).not.toContain("Actualización importante");
    expect(markdown).not.toContain("Eventos no oficiales");
  });

  it("renders team footer with roles and escaped names", () => {
    const html = competitionTeamEmailFooterHtml({
      logoUrl: "https://example.com/comp-logo.png",
      competitionName: "UPEN Open 2026",
      people: [
        { name: "Ana <Org>", image: null, role: "organizador" },
        {
          name: "Leo",
          image: "https://example.com/a.png",
          role: "delegado",
        },
      ],
    });

    expect(html).toContain("https://example.com/comp-logo.png");
    expect(html).not.toContain(AMS_EMAIL.logoUrl);
    expect(html).toContain('alt="UPEN Open 2026"');
    expect(html).toContain("ORGANIZADOR");
    expect(html).toContain("DELEGADO");
    expect(html).toContain("Ana &lt;Org&gt;");
    expect(html).toContain("https://example.com/a.png");
  });

  it("omits footer logo when competition logo is missing", () => {
    const html = competitionTeamEmailFooterHtml({
      people: [{ name: "Ana", image: null, role: "organizador" }],
    });
    expect(html).not.toContain(AMS_EMAIL.logoUrl);
    expect(html).not.toContain("<img src=");
    expect(html).toContain("ORGANIZADOR");
  });
});
