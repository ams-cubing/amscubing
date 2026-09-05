import Image from "next/image";
import Link from "next/link";
import { CALENDAR_URL, CONTACT_EMAIL, PRIVACY_URL } from "@/lib/content";

const siteLinks = [
  { label: "Home", href: "/" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Torneos", href: "/torneos" },
  { label: "Blog", href: "/blog" },
  { label: "Cursos", href: "/cursos" },
] as const;

export function SiteFooter() {
  return (
    <footer
      className="ams-texture relative overflow-hidden bg-[var(--ams-navy)] px-0 py-[70px] pb-10 text-white"
      style={{ fontFamily: "var(--font-sans), sans-serif" }}
    >
      <div className="absolute inset-0 bg-[var(--ams-navy)]/78" />
      <div className="ams-container relative">
        <div className="grid gap-10 border-b border-white/10 pb-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <Image
                src="/source/isotipo-color-sm.png"
                alt=""
                width={42}
                height={24}
                className="h-8 w-auto"
              />
              <span className="ams-display text-xl">AMS</span>
            </div>
            <p className="max-w-sm text-sm leading-7 text-white/60">
              Asociación Mexicana de Speedcubing. Comunidad mexicana alineada a
              competencias oficiales de la World Cube Association.
            </p>
          </div>
          <div>
            <h2 className="ams-heading mb-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--ams-orange)]">
              Sitio
            </h2>
            <div className="grid gap-3 text-sm">
              {siteLinks.map((link) =>
                link.href.startsWith("/") ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-white/70 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-white/70 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                ),
              )}
            </div>
          </div>
          <div>
            <h2 className="ams-heading mb-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--ams-orange)]">
              Comunidad
            </h2>
            <div className="grid gap-3 text-sm">
              <a href={CALENDAR_URL} className="text-white/70 hover:text-white">
                Ser voluntario
              </a>
              <Link href="/torneos" className="text-white/70 hover:text-white">
                Organizar un torneo
              </Link>
              <a
                href="https://www.worldcubeassociation.org/regulations/"
                className="text-white/70 hover:text-white"
              >
                Reglas WCA
              </a>
            </div>
          </div>
          <div>
            <h2 className="ams-heading mb-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--ams-orange)]">
              Síguenos
            </h2>
            <div className="grid gap-3 text-sm">
              <a
                href="https://www.facebook.com/AMScubing/"
                className="text-white/70 hover:text-white"
              >
                Facebook
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-white/70 hover:text-white"
              >
                Contacto
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-7 text-sm text-white/50">
          <p>
            © {new Date().getFullYear()} Asociación Mexicana de Speedcubing.
          </p>
          <Link
            href={PRIVACY_URL}
            className="ams-glass rounded-full border border-white/25 bg-[var(--ams-orange)]/70 px-4 py-2 font-bold text-white"
          >
            Aviso de privacidad
          </Link>
        </div>
      </div>
    </footer>
  );
}
