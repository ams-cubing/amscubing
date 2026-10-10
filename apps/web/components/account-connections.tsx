"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
export function AccountConnections({
  verified,
  linked,
}: {
  verified: boolean;
  linked: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [url, setUrl] = useState<string | null>(null);
  async function verify() {
    setBusy(true);
    setMessage("");
    try {
      const session = await authClient.getSession();
      if (!session.data) return;
      const result = await authClient.sendVerificationEmail({
        email: session.data.user.email,
        callbackURL: `${window.location.origin}/cuenta`,
      });
      if (result.error) throw new Error();
      setMessage("Revisa tu correo para verificar la cuenta.");
      const response = await fetch("/api/cuenta/verificacion-local");
      if (response.ok) {
        const result = await response.json();
        setUrl(result.url);
        if (result.url)
          setMessage(
            "Entorno local: abre el enlace de verificación de tu cuenta.",
          );
      }
    } catch {
      setMessage("No se pudo enviar la verificación. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  async function link() {
    setBusy(true);
    setMessage("");
    try {
      const result = await authClient.oauth2.link({
        providerId: "wca",
        callbackURL: `${window.location.origin}/cuenta`,
        errorCallbackURL: `${window.location.origin}/iniciar-sesion?returnTo=${encodeURIComponent("/cuenta")}`,
      });
      if (result.error) throw new Error();
    } catch {
      setMessage("No se pudo iniciar la vinculación con WCA.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-6 rounded-2xl bg-white/10 p-5 ams-copy">
      <h3 className="font-bold">Acceso y vinculaciones</h3>
      <p className="mt-2 text-sm">
        {verified
          ? "Correo verificado"
          : "Tu correo está pendiente de verificación"}{" "}
        ·{" "}
        {linked
          ? "Cuenta WCA vinculada"
          : "Puedes vincular WCA cuando tengas una cuenta"}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {!verified && (
          <button
            disabled={busy}
            onClick={() => void verify()}
            className="rounded-md bg-white px-4 py-3 text-sm font-bold text-ams-navy"
          >
            Verificar correo
          </button>
        )}
        {!linked && (
          <button
            disabled={busy}
            onClick={() => void link()}
            className="rounded-md bg-ams-red px-4 py-3 text-sm font-bold text-white"
          >
            Vincular cuenta WCA ↗
          </button>
        )}
        {url && (
          <a
            href={url}
            className="rounded-md bg-ams-green px-4 py-3 text-sm font-bold text-white"
          >
            Abrir verificación local
          </a>
        )}
      </div>
      {message && (
        <p className="mt-4 text-sm" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
