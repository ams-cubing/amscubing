import Image from "next/image";
import { ExternalLink, MapPin } from "lucide-react";
import type { PublicDelegate } from "@/lib/delegate-types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Delegados({ delegates }: { delegates: PublicDelegate[] }) {
  return (
    <section
      id="delegados"
      className="ams-texture relative overflow-hidden bg-[var(--ams-navy)] py-24 text-white md:py-32"
    >
      <div className="absolute inset-0 bg-[#010b19]/90" />
      <div className="ams-container relative">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="ams-heading mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--ams-orange)]">
              WCA en México
            </p>
            <h2 className="ams-display text-[clamp(2rem,5vw,3.75rem)] leading-none">
              Delegados WCA
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-white/70">
            Personas voluntarias que garantizan la integridad y calidad de las
            competencias oficiales en cada región.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {delegates.map((delegate, index) => (
            <a
              key={delegate.wcaId}
              href={delegate.wcaProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`group ams-slash-card ${
                index % 2 === 1 ? "ams-slash-card-right" : ""
              } overflow-hidden border border-white/10 bg-white text-[var(--ams-navy)] shadow-[0_20px_42px_rgba(0,0,0,0.2)] transition-transform hover:-translate-y-1`}
            >
              <div className="relative h-56 bg-[var(--ams-soft)]">
                {delegate.avatarUrl ? (
                  <Image
                    src={delegate.avatarUrl}
                    alt={`Foto de ${delegate.name}`}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-[linear-gradient(135deg,var(--ams-red),var(--ams-orange))]">
                    <span className="ams-display text-5xl text-white">
                      {initials(delegate.name)}
                    </span>
                  </div>
                )}
                <span className="absolute left-0 top-0 bg-[var(--ams-red)] px-4 py-2 text-xs font-bold uppercase text-white [clip-path:polygon(0_0,100%_0,88%_100%,0_100%)]">
                  {delegate.wcaId}
                </span>
              </div>
              <div className="space-y-3 p-5">
                <h3 className="ams-heading text-lg font-bold leading-tight">
                  {delegate.name}
                </h3>
                <p className="text-sm font-semibold text-[var(--ams-red)]">
                  {delegate.title}
                </p>
                <p className="inline-flex items-center gap-2 text-sm text-black/60">
                  <MapPin className="size-4 text-[var(--ams-green)]" />
                  {delegate.location}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--ams-navy)] transition-colors group-hover:text-[var(--ams-orange)]">
                  Perfil WCA
                  <ExternalLink className="size-3.5" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
