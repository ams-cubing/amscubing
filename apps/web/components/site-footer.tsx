import Image from "next/image";
import { PRIVACY_URL } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="bg-[var(--ams-ink)] py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-3">
          <Image src="/icon.png" alt="" width={36} height={36} className="size-9" />
          <div>
            <p className="text-sm font-semibold">
              Asociación Mexicana de Speedcubing
            </p>
            <p className="mt-1 text-xs text-white/55">
              © {new Date().getFullYear()} Asociación Mexicana de Speedcubing.
              Todos los derechos reservados.
            </p>
          </div>
        </div>
        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-white/70 transition-colors hover:text-white"
        >
          Aviso de Privacidad
        </a>
      </div>
    </footer>
  );
}
