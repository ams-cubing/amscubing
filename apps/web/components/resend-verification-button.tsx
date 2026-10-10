"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ResendVerificationButton({
  email,
  callbackPath = "/cuenta",
  className,
}: {
  email?: string;
  callbackPath?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "busy" | "sent" | "error">(
    "idle",
  );

  async function resend() {
    setStatus("busy");
    try {
      const target =
        email ?? (await authClient.getSession()).data?.user.email ?? null;
      if (!target) throw new Error();
      const result = await authClient.sendVerificationEmail({
        email: target,
        callbackURL: `${window.location.origin}${callbackPath}`,
      });
      if (result.error) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={status === "busy" || status === "sent"}
        onClick={() => void resend()}
        className={
          className ??
          "rounded-md bg-ams-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        }
      >
        {status === "busy" ? "Enviando…" : "Reenviar correo"}
      </button>
      <span role="status" className="text-sm">
        {status === "sent"
          ? "Listo, revisa tu bandeja de entrada."
          : status === "error"
            ? "No se pudo enviar. Inténtalo más tarde."
            : null}
      </span>
    </span>
  );
}
