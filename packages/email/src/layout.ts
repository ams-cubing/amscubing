/** AMS brand tokens mirrored from packages/ui globals (email-safe hardcoded hex). */
export const AMS_EMAIL = {
  navy: "#010b19",
  red: "#ba0c2f",
  orange: "#fe5000",
  green: "#009a44",
  paper: "#fffaf2",
  soft: "#f4f4f4",
  white: "#ffffff",
  logoUrl: "https://amscubing.org/source/isotipo-color-sm.png",
  siteUrl: "https://amscubing.org",
  fontStack: "Arial, Helvetica, sans-serif",
} as const;

export type EmailCta = {
  label: string;
  href: string;
};

export function renderEmailLayout(input: {
  previewText?: string;
  title?: string;
  bodyHtml: string;
  cta?: EmailCta;
}) {
  const { navy, red, green, paper, soft, white, logoUrl, siteUrl, fontStack } =
    AMS_EMAIL;

  const preview = input.previewText
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(input.previewText)}</div>`
    : "";

  const titleBlock = input.title
    ? `<h1 style="margin:0 0 16px;font-family:${fontStack};font-size:20px;font-weight:700;line-height:1.3;color:${navy};">${escapeHtml(input.title)}</h1>`
    : "";

  const ctaBlock = input.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
        <tr>
          <td align="center" bgcolor="${green}" style="border-radius:6px;background-color:${green};">
            <a href="${escapeHtml(input.cta.href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-family:${fontStack};font-size:15px;font-weight:700;line-height:1.2;color:${white};text-decoration:none;border-radius:6px;">${escapeHtml(input.cta.label)}</a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>AMS</title>
</head>
<body style="margin:0;padding:0;background-color:${soft};font-family:${fontStack};">
  ${preview}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${soft};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${paper};border-collapse:collapse;">
          <tr>
            <td style="background-color:${navy};border-bottom:3px solid ${red};padding:20px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${logoUrl}" alt="AMS" width="42" height="24" style="display:block;width:42px;height:24px;border:0;"/>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-family:${fontStack};font-size:22px;font-weight:700;letter-spacing:0.04em;color:${white};">AMS</span>
                  </td>
                </tr>
              </table>
              <p style="margin:10px 0 0;font-family:${fontStack};font-size:12px;line-height:1.4;color:rgba(255,255,255,0.72);">Asociación Mexicana de Speedcubing</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;background-color:${white};color:${navy};font-family:${fontStack};font-size:15px;line-height:1.55;">
              ${titleBlock}
              <div style="color:${navy};font-family:${fontStack};font-size:15px;line-height:1.55;">
                ${input.bodyHtml}
              </div>
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="background-color:${navy};padding:20px 24px;">
              <p style="margin:0 0 8px;font-family:${fontStack};font-size:13px;line-height:1.5;color:rgba(255,255,255,0.78);">
                Saludos,<br/>Equipo de la Asociación Mexicana de Speedcubing
              </p>
              <p style="margin:0;font-family:${fontStack};font-size:12px;line-height:1.4;">
                <a href="${siteUrl}" style="color:${AMS_EMAIL.orange};text-decoration:none;">amscubing.org</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Paragraph helper with consistent body styles for template fragments. */
export function emailParagraph(html: string) {
  const { navy, fontStack } = AMS_EMAIL;
  return `<p style="margin:0 0 14px;font-family:${fontStack};font-size:15px;line-height:1.55;color:${navy};">${html}</p>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
