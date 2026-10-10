import { AmsSignInLink } from "@workspace/ui/components/ams-sign-in-link";

import { AccountSignOut } from "@/components/account-sign-out";
import { getCrossAppSignInUrl, getWebUrl } from "@/lib/urls";

import type { AccountUser } from "../_lib/account-data";

export function AccountHeader({
  user,
  profileLevel,
  hasWcaAccount,
}: {
  user: AccountUser | undefined;
  profileLevel: string;
  hasWcaAccount: boolean;
}) {
  if (!user) {
    return (
      <div className="ams-texture mb-10 overflow-hidden rounded-3xl bg-ams-navy p-8 text-white md:p-10">
        <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-ams-orange">
          Acceso único
        </p>
        <h2 className="ams-display max-w-2xl text-[clamp(2rem,5vw,3.5rem)] leading-none">
          Entra a la comunidad AMS
        </h2>
        <p className="ams-copy my-6 max-w-2xl text-base leading-7 text-white/75">
          Regístrate con correo o entra con WCA. Tu sesión se comparte entre la
          web, Cursos, Blog, Calendario y Tableros.
        </p>
        <AmsSignInLink
          href={getCrossAppSignInUrl(`${getWebUrl()}/cuenta`)}
          label="Iniciar sesión o crear cuenta"
        />
      </div>
    );
  }

  return (
    <div className="mb-10 flex flex-wrap items-center justify-between gap-5 rounded-5.5 bg-ams-soft p-6 md:p-8">
      <div className="flex items-center gap-4">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name}
            className="size-16 rounded-full object-cover"
          />
        ) : (
          <div className="ams-display flex size-16 items-center justify-center rounded-full bg-ams-navy text-xl text-white">
            {getInitials(user.name)}
          </div>
        )}
        <div>
          <p className="ams-heading text-sm font-bold uppercase tracking-[0.08em] text-ams-red">
            {profileLevel}
          </p>
          <h2 className="ams-display text-3xl leading-none text-ams-navy">
            {user.name}
          </h2>
          <p className="ams-heading mt-1 text-sm text-black/55">
            {user.wcaId ??
              (hasWcaAccount
                ? "Cuenta WCA vinculada; aún sin WCA ID."
                : "Cuenta AMS · puedes vincular WCA más adelante.")}
          </p>
        </div>
      </div>
      <AccountSignOut />
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
