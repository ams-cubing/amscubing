"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { unlinkWca } from "@/app/cuenta/actions";
export function ProfileSecurity({
  credential,
  linked,
  verified,
}: {
  credential: boolean;
  linked: boolean;
  verified: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  async function revoke() {
    setBusy(true);
    try {
      const result = await authClient.revokeOtherSessions();
      setMessage(
        result.error
          ? "No se pudieron cerrar las otras sesiones."
          : "Las otras sesiones se cerraron. Esta sesión sigue activa.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function unlink() {
    setBusy(true);
    try {
      const result = await unlinkWca();
      setMessage(result.message);
      if (result.ok) {
        setConfirmUnlink(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }
  async function password(form: FormData) {
    const currentPassword = String(form.get("currentPassword"));
    const newPassword = String(form.get("newPassword"));
    if (newPassword !== form.get("confirmPassword")) {
      setMessage("Las contraseñas nuevas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      setMessage(
        result.error
          ? "No se pudo cambiar la contraseña. Revisa tu contraseña actual."
          : "Contraseña actualizada. Se cerraron las otras sesiones.",
      );
    } finally {
      setBusy(false);
    }
  }
  const button =
    "rounded-xl border border-black/15 bg-white px-4 py-3 text-sm font-bold disabled:opacity-50";
  const field =
    "mt-2 w-full rounded-xl border border-black/15 bg-white px-4 py-3";
  return (
    <section className="ams-copy rounded-3xl border border-black/10 p-6">
      <h2 className="ams-display mb-4 text-3xl">Seguridad</h2>
      <button
        type="button"
        onClick={() => void revoke()}
        disabled={busy}
        className={button}
      >
        Cerrar las otras sesiones
      </button>
      {credential && (
        <form action={password} className="mt-6 space-y-4">
          <h3 className="font-bold">Cambiar contraseña</h3>
          <label className="block text-sm">
            Contraseña actual
            <input
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              required
              maxLength={128}
              className={field}
            />
          </label>
          <label className="block text-sm">
            Nueva contraseña
            <input
              type="password"
              name="newPassword"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              className={field}
            />
          </label>
          <label className="block text-sm">
            Repetir nueva contraseña
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              className={field}
            />
          </label>
          <button disabled={busy} className={button}>
            Actualizar contraseña
          </button>
        </form>
      )}
      {linked && (
        <div className="mt-6 border-t border-black/10 pt-5">
          {credential && verified ? (
            <>
              {confirmUnlink ? (
                <div>
                  <p className="mb-3 text-sm">
                    Entrarás con tu correo y contraseña AMS. Tus cursos y
                    comentarios se conservarán.
                  </p>
                  <button
                    disabled={busy}
                    onClick={() => void unlink()}
                    className={`${button} text-ams-red`}
                  >
                    Confirmar desvinculación
                  </button>
                  <button
                    onClick={() => setConfirmUnlink(false)}
                    className="ml-4 text-sm underline"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmUnlink(true)}
                  className="text-sm text-ams-red underline"
                >
                  Desvincular cuenta WCA
                </button>
              )}
            </>
          ) : (
            <p className="text-xs leading-5 text-black/60">
              WCA es tu método de acceso. Para desvincularla necesitas primero
              un correo verificado y una contraseña AMS.
            </p>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
