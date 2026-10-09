"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
export function LoginForm({
  callbackURL,
  wcaEnabled,
}: {
  callbackURL: string;
  wcaEnabled: boolean;
}) {
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email")).trim().toLowerCase();
    const password = String(data.get("password") ?? "");
    try {
      const result =
        mode === "register"
          ? await authClient.signUp.email({
              email,
              password,
              name: String(data.get("name")).trim(),
              callbackURL,
            })
          : mode === "reset"
            ? await authClient.requestPasswordReset({
                email,
                redirectTo: `${window.location.origin}/restablecer-contrasena`,
              })
            : await authClient.signIn.email({ email, password, callbackURL });
      if (result.error) {
        setError(
          mode === "login"
            ? "Correo o contraseña incorrectos."
            : "No se pudo completar la solicitud. Revisa los datos e inténtalo de nuevo.",
        );
        return;
      }
      if (mode === "reset") {
        setMessage(
          "Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.",
        );
        return;
      }
      window.location.assign(callbackURL);
    } catch {
      setError("No se pudo conectar. Inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  async function wca() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.oauth2({
        providerId: "wca",
        callbackURL,
        errorCallbackURL: `${window.location.origin}/iniciar-sesion`,
      });
      if (result.error) setError("No se pudo iniciar el acceso con WCA.");
    } catch {
      setError("No se pudo iniciar el acceso con WCA.");
    } finally {
      setBusy(false);
    }
  }
  const field =
    "mt-2 w-full rounded-md border border-ams-navy/20 bg-white p-3 text-ams-navy";
  return (
    <div className="rounded-3xl bg-ams-soft p-8 ams-copy">
      <div className="mb-7 flex flex-wrap gap-3">
        {(["login", "register"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={mode === v}
            onClick={() => {
              setMode(v);
              setError("");
              setMessage("");
            }}
            className={`rounded-md px-5 py-3 text-sm font-bold ${mode === v ? "bg-ams-navy text-white" : "bg-white text-ams-navy"}`}
          >
            {v === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        ))}
      </div>
      <h2 className="ams-heading text-xl font-bold">
        {mode === "register"
          ? "Únete a la comunidad"
          : mode === "reset"
            ? "Recuperar acceso"
            : "Bienvenido a AMS"}
      </h2>
      {error && (
        <p role="alert" className="mt-4 text-ams-red">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-ams-green">
          {message}
        </p>
      )}
      <form onSubmit={submit} className="mt-6 space-y-5">
        {mode === "register" && (
          <label className="block">
            Nombre
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              className={field}
            />
          </label>
        )}
        <label className="block">
          Correo electrónico
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className={field}
          />
        </label>
        {mode !== "reset" && (
          <label className="block">
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              minLength={mode === "register" ? 12 : 1}
              maxLength={128}
              required
              className={field}
            />
            {mode === "register" && (
              <span className="text-sm text-ams-navy/65">
                Usa al menos 12 caracteres.
              </span>
            )}
          </label>
        )}
        <button
          disabled={busy}
          className="w-full rounded-md bg-ams-red px-6 py-4 font-bold text-white disabled:opacity-50"
        >
          {busy
            ? "Procesando…"
            : mode === "register"
              ? "Crear cuenta AMS"
              : mode === "reset"
                ? "Enviar instrucciones"
                : "Entrar con correo"}
        </button>
      </form>
      {mode === "login" && (
        <button
          type="button"
          className="mt-5 text-sm underline"
          onClick={() => setMode("reset")}
        >
          Olvidé mi contraseña
        </button>
      )}
      {mode === "reset" && (
        <button
          type="button"
          className="mt-5 text-sm underline"
          onClick={() => setMode("login")}
        >
          Volver al inicio de sesión
        </button>
      )}
      {wcaEnabled && (
        <>
          <p className="my-6 text-center text-sm text-ams-navy/60">
            También puedes usar tu cuenta WCA
          </p>
          <button
            type="button"
            onClick={() => void wca()}
            disabled={busy}
            className="w-full rounded-md bg-ams-navy px-6 py-4 font-bold text-white disabled:opacity-50"
          >
            Continuar con WCA ↗
          </button>
        </>
      )}
      <p className="mt-6 text-sm text-ams-navy/65">
        Verifica tu correo para comentar y recuperar el historial de tus cursos
        anteriores. Tener un WCA ID no es requisito para crear una cuenta AMS.
      </p>
    </div>
  );
}
