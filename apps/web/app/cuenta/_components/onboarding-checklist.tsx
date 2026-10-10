import { CheckCircle2, Circle } from "lucide-react";

import { ResendVerificationButton } from "@/components/resend-verification-button";

import type { AccountData, AccountUser } from "../_lib/account-data";

export function OnboardingChecklist({
  user,
  data,
}: {
  user: AccountUser;
  data: AccountData;
}) {
  const steps = [
    {
      id: "email",
      title: "Verifica tu correo",
      description:
        "Necesario para comentar en el blog y recuperar tu historial de cursos.",
      done: user.emailVerified,
      action: <ResendVerificationButton email={user.email} />,
    },
    {
      id: "wca",
      title: "Vincula tu cuenta WCA",
      description:
        "Conecta tu WCA ID para que tus resultados y competencias aparezcan en AMS.",
      done: Boolean(data.wcaAccount),
      action: (
        <a href="#vinculaciones" className="text-sm font-bold underline">
          Ir a vinculaciones
        </a>
      ),
    },
    {
      id: "profile",
      title: "Completa tu perfil",
      description: "Agrega tu ciudad para conectar con la comunidad cercana.",
      done: Boolean(data.profile?.city?.trim()),
      action: (
        <a href="#datos" className="text-sm font-bold underline">
          Editar datos personales
        </a>
      ),
    },
  ];
  const completed = steps.filter((step) => step.done).length;
  if (completed === steps.length) return null;

  return (
    <section
      aria-labelledby="onboarding-title"
      className="mb-10 rounded-3xl border-l-4 border-ams-green bg-ams-soft p-6 md:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
            Primeros pasos
          </p>
          <h2
            id="onboarding-title"
            className="ams-display text-[clamp(1.75rem,4vw,2.5rem)] leading-none"
          >
            Completa tu cuenta AMS
          </h2>
        </div>
        <p className="ams-copy text-sm font-bold text-black/60">
          {completed} de {steps.length}
        </p>
      </div>
      <div
        className="mt-5 h-2 overflow-hidden rounded-full bg-white"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={completed}
        aria-label="Progreso de tu cuenta"
      >
        <div
          className="h-full bg-ams-green transition-[width]"
          style={{ width: `${(completed / steps.length) * 100}%` }}
        />
      </div>
      <ol className="ams-copy mt-6 grid gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <li key={step.id} className="rounded-2xl bg-white p-5">
            <div className="flex items-center gap-2 font-bold text-ams-navy">
              {step.done ? (
                <CheckCircle2 className="size-5 text-ams-green" aria-hidden />
              ) : (
                <Circle className="size-5 text-black/30" aria-hidden />
              )}
              <span className={step.done ? "line-through opacity-60" : ""}>
                {step.title}
              </span>
              {step.done && <span className="sr-only">(completado)</span>}
            </div>
            <p className="mt-2 text-sm leading-6 text-black/65">
              {step.description}
            </p>
            {!step.done && <div className="mt-4">{step.action}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}
