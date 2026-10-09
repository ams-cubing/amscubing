"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
export function ResetForm({ token }: { token: string }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-8 ams-copy"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const data = new FormData(e.currentTarget);
          const password = String(data.get("password"));
          if (password !== data.get("confirm")) {
            setMessage("Las contraseñas no coinciden.");
            return;
          }
          const result = await authClient.resetPassword({
            token,
            newPassword: password,
          });
          setMessage(
            result.error
              ? "El enlace no es válido o ya expiró."
              : "Contraseña actualizada. Ya puedes iniciar sesión.",
          );
        } catch {
          setMessage("No se pudo completar la solicitud.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        Nueva contraseña
        <input
          required
          minLength={12}
          maxLength={128}
          name="password"
          type="password"
          autoComplete="new-password"
          className="mt-2 w-full rounded border p-3"
        />
      </label>
      <label className="mt-5 block">
        Confirma la contraseña
        <input
          required
          minLength={12}
          maxLength={128}
          name="confirm"
          type="password"
          autoComplete="new-password"
          className="mt-2 w-full rounded border p-3"
        />
      </label>
      <button
        disabled={busy || !token}
        className="mt-6 rounded bg-ams-red p-4 font-bold text-white"
      >
        Guardar contraseña
      </button>
      <p role="status" className="mt-4">
        {message}
      </p>
      <a href="/iniciar-sesion" className="underline">
        Iniciar sesión
      </a>
    </form>
  );
}
