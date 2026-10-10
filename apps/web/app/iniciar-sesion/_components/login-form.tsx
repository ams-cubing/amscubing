"use client";
import { useState } from "react";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ResendVerificationButton } from "@/components/resend-verification-button";

export type LoginMode = "login" | "register" | "reset";

const MIN_PASSWORD_LENGTH = 12;

export function LoginForm({
  callbackURL,
  wcaEnabled,
  initialMode = "login",
}: {
  callbackURL: string;
  wcaEnabled: boolean;
  initialMode?: LoginMode;
}) {
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const errorCallbackURL = () =>
    `${window.location.origin}/iniciar-sesion?returnTo=${encodeURIComponent(callbackURL)}`;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email")).trim().toLowerCase();
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
      if (mode === "register") {
        setRegisteredEmail(email);
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
        errorCallbackURL: errorCallbackURL(),
      });
      if (result.error) setError("No se pudo iniciar el acceso con WCA.");
    } catch {
      setError("No se pudo iniciar el acceso con WCA.");
    } finally {
      setBusy(false);
    }
  }
  function switchMode(next: LoginMode) {
    setMode(next);
    setError("");
    setMessage("");
    setPassword("");
  }

  if (registeredEmail) {
    return (
      <div className="rounded-3xl bg-ams-soft p-8 ams-copy" role="status">
        <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-ams-green text-white">
          <MailCheck className="size-6" aria-hidden />
        </div>
        <h2 className="ams-heading text-xl font-bold">
          Revisa tu correo para verificar tu cuenta
        </h2>
        <p className="mt-3 text-ams-navy/75">
          Enviamos un enlace de verificación a{" "}
          <strong className="text-ams-navy">{registeredEmail}</strong>.
          Verificar tu correo te permite comentar en el blog y recuperar tu
          historial de cursos.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <a
            href={callbackURL}
            className="rounded-md bg-ams-red px-6 py-3 font-bold text-white"
          >
            Continuar
          </a>
          <ResendVerificationButton
            email={registeredEmail}
            className="rounded-md bg-white px-5 py-3 text-sm font-bold text-ams-navy disabled:opacity-50"
          />
        </div>
      </div>
    );
  }

  const field =
    "mt-2 w-full rounded-md border border-ams-navy/20 bg-white p-3 text-ams-navy";
  return (
    <div className="rounded-3xl bg-ams-soft p-8 ams-copy">
      {wcaEnabled && (
        <>
          <button
            type="button"
            onClick={() => void wca()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-md bg-ams-navy px-6 py-4 font-bold text-white disabled:opacity-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/source/wca-logo.svg"
              alt=""
              aria-hidden
              width={28}
              height={28}
            />
            Continuar con WCA
          </button>
          <div className="my-7 flex items-center gap-4 text-sm text-ams-navy/60">
            <span className="h-px flex-1 bg-ams-navy/15" />
            o usa tu correo
            <span className="h-px flex-1 bg-ams-navy/15" />
          </div>
        </>
      )}
      <div className="mb-7 flex flex-wrap gap-3">
        {(["login", "register"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={mode === v}
            onClick={() => switchMode(v)}
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
          <div>
            <label htmlFor="password" className="block">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                minLength={mode === "register" ? MIN_PASSWORD_LENGTH : 1}
                maxLength={128}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={
                  mode === "register" ? "password-hint" : undefined
                }
                className={`${field} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                aria-pressed={showPassword}
                className="absolute right-2 top-1/2 mt-1 -translate-y-1/2 rounded p-2 text-ams-navy/60 hover:text-ams-navy"
              >
                {showPassword ? (
                  <EyeOff className="size-5" aria-hidden />
                ) : (
                  <Eye className="size-5" aria-hidden />
                )}
              </button>
            </div>
            {mode === "register" && (
              <span
                id="password-hint"
                aria-live="polite"
                className={`mt-1 block text-sm ${password.length >= MIN_PASSWORD_LENGTH ? "text-ams-green" : "text-ams-navy/65"}`}
              >
                {Math.min(password.length, MIN_PASSWORD_LENGTH)}/
                {MIN_PASSWORD_LENGTH} caracteres mínimos
                {password.length >= MIN_PASSWORD_LENGTH ? " ✓" : ""}
              </span>
            )}
          </div>
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
          onClick={() => switchMode("reset")}
        >
          Olvidé mi contraseña
        </button>
      )}
      {mode === "reset" && (
        <button
          type="button"
          className="mt-5 text-sm underline"
          onClick={() => switchMode("login")}
        >
          Volver al inicio de sesión
        </button>
      )}
      <p className="mt-6 text-sm text-ams-navy/65">
        Verifica tu correo para comentar y recuperar el historial de tus cursos
        anteriores. Tener un WCA ID no es requisito para crear una cuenta AMS.
      </p>
    </div>
  );
}
