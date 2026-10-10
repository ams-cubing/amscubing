import { cacheLife } from "next/cache";
import { Suspense } from "react";

import { Button } from "@workspace/ui/components/button";

/** Requires `cacheComponents` in the consuming app (the copyright year is cached). */
async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/$/, "")}${path}`;
}

const linkClass = "text-white/70 transition-colors hover:text-white";
const headingClass =
  "ams-heading mb-4 text-xs font-bold uppercase tracking-widest text-ams-orange";

export function AmsSiteFooter({
  webUrl,
  calendarUrl,
  blogUrl,
  coursesUrl,
  contactEmail = "contacto@amscubing.org",
}: {
  webUrl: string;
  calendarUrl: string;
  blogUrl: string;
  coursesUrl: string;
  contactEmail?: string;
}) {
  const siteLinks = [
    { label: "Inicio", href: joinUrl(webUrl, "/") },
    { label: "Nosotros", href: joinUrl(webUrl, "/nosotros") },
    { label: "Competencias", href: joinUrl(webUrl, "/competencias") },
    { label: "Blog", href: blogUrl },
    { label: "Cursos", href: coursesUrl },
  ];

  return (
    <footer
      className="ams-texture relative overflow-hidden bg-ams-navy px-0 py-17.5 pb-10 text-white"
      style={{ fontFamily: "var(--font-sans), sans-serif" }}
    >
      <div className="absolute inset-0 bg-ams-navy/78" />
      <div className="ams-container relative">
        <div className="grid gap-10 border-b border-white/10 pb-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <img
                src="/source/isotipo-color-sm.png"
                alt="AMS"
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
            <h2 className={headingClass}>Sitio</h2>
            <div className="grid gap-3 text-sm">
              {siteLinks.map((link) => (
                <a key={link.label} href={link.href} className={linkClass}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h2 className={headingClass}>Comunidad</h2>
            <div className="grid gap-3 text-sm">
              <a
                href={joinUrl(calendarUrl, "/solicitar-fecha")}
                className={linkClass}
              >
                Organizar una competencia
              </a>
              <a
                href="https://www.worldcubeassociation.org/regulations/"
                className={linkClass}
              >
                Reglas WCA
              </a>
            </div>
          </div>
          <div>
            <h2 className={headingClass}>Síguenos</h2>
            <div className="grid gap-3 text-sm">
              <a
                href="https://www.facebook.com/AMScubing/"
                className={linkClass}
              >
                Facebook
              </a>
              <a
                href="https://www.instagram.com/amscubing/"
                className={linkClass}
              >
                Instagram
              </a>
              <a href="https://www.twitch.tv/amscubing" className={linkClass}>
                Twitch
              </a>
              <a href={`mailto:${contactEmail}`} className={linkClass}>
                Contacto
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-7 text-sm text-white/50">
          <p>
            ©{" "}
            <Suspense fallback="2026">
              <CopyrightYear />
            </Suspense>{" "}
            Asociación Mexicana de Speedcubing.
          </p>
          <Button
            asChild
            size="sm"
            variant="accent"
            className="ams-glass border border-white/25 bg-ams-orange/70"
          >
            <a href={joinUrl(webUrl, "/aviso-de-privacidad")}>
              Aviso de privacidad
            </a>
          </Button>
        </div>
      </div>
    </footer>
  );
}
