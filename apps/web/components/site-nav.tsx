import Image from "next/image";
import Link from "next/link";
import { CALENDAR_URL } from "@/lib/content";

export function SiteNav() {
  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-5 md:px-8">
        <Link href="/" className="flex items-center gap-3 text-white">
          <Image
            src="/icon.png"
            alt=""
            width={40}
            height={40}
            className="size-10"
            priority
          />
          <span className="max-w-[14rem] text-sm font-semibold leading-tight tracking-tight md:max-w-none md:text-base">
            Asociación Mexicana de Speedcubing
          </span>
        </Link>
        <div className="flex items-center gap-5 text-sm font-medium text-white/90">
          <Link href="/" className="transition-colors hover:text-white">
            Inicio
          </Link>
          <a
            href={CALENDAR_URL}
            className="transition-colors hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            Calendario
          </a>
        </div>
      </nav>
    </header>
  );
}
