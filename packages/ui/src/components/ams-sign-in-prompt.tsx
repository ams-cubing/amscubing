import { LogIn } from "lucide-react";

export function AmsSignInPrompt({
  title = "Inicia sesión para continuar",
  description,
  signInHref,
  actionLabel = "Iniciar sesión",
}: {
  title?: string;
  description: string;
  signInHref: string;
  actionLabel?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-ams-navy p-8 text-white md:p-10">
      <div className="ams-texture absolute inset-0 opacity-20" />
      <div className="relative">
        <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-ams-orange">
          Cuenta AMS
        </p>
        <h2 className="ams-display max-w-2xl text-[clamp(1.75rem,4vw,2.75rem)] leading-none">
          {title}
        </h2>
        <p className="ams-copy my-6 max-w-2xl text-base leading-7 text-white/75">
          {description}
        </p>
        <a
          href={signInHref}
          className="inline-flex items-center gap-2 rounded-md bg-ams-red px-6 py-3 font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          <LogIn className="size-4" />
          {actionLabel}
        </a>
      </div>
    </div>
  );
}
