import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sendEmail, renderEmailLayout } from "@workspace/email";
function directory() {
  return resolve(process.env.AUTH_DEV_MAIL_DIR ?? "../../.codex/dev-mail");
}
function filename(userId: string, kind: string) {
  return `${createHash("sha256").update(`${userId}:${kind}`).digest("hex")}.json`;
}
export async function sendAuthEmail(input: {
  userId: string;
  email: string;
  url: string;
  kind: "verify" | "reset";
}) {
  const title =
    input.kind === "verify"
      ? "Verifica tu cuenta AMS"
      : "Recupera tu cuenta AMS";
  if (process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY) {
    const dir = directory();
    await mkdir(dir, { recursive: true });
    await writeFile(
      resolve(dir, filename(input.userId, input.kind)),
      JSON.stringify({ url: input.url, createdAt: Date.now() }),
    );
    return;
  }
  const result = await sendEmail({
    to: input.email,
    subject: title,
    html: renderEmailLayout({
      title,
      previewText: title,
      bodyHtml:
        "<p>Usa el siguiente enlace para continuar. Si no solicitaste esta acción, puedes ignorar este mensaje.</p>",
      cta: {
        label:
          input.kind === "verify"
            ? "Verificar correo"
            : "Restablecer contraseña",
        href: input.url,
      },
    }),
  });
  if (!result.ok)
    throw new Error("No se pudo entregar el correo de autenticación");
}
export async function readDevVerification(userId: string) {
  if (process.env.NODE_ENV === "production" || process.env.RESEND_API_KEY)
    return null;
  try {
    const mail = JSON.parse(
      await readFile(resolve(directory(), filename(userId, "verify")), "utf8"),
    );
    return Date.now() - mail.createdAt < 3600000 ? (mail.url as string) : null;
  } catch {
    return null;
  }
}
