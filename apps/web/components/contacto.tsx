import { Mail, Send } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/content";

export function Contacto() {
  return (
    <section id="contacto" className="bg-white py-20">
      <div className="ams-container flex flex-col items-start justify-between gap-8 border-l-4 border-[var(--ams-green)] bg-[var(--ams-soft)] p-7 md:flex-row md:items-center md:p-10">
        <div>
          <p className="ams-heading mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--ams-red)]">
            Contacto
          </p>
          <h2 className="ams-display text-[clamp(2rem,5vw,3.5rem)] leading-none">
            ¿Te interesa saber más?
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-black/68">
            Escríbenos para temas de comunidad, voluntariado, comunicación o
            apoyo general de AMS.
          </p>
        </div>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="ams-glass inline-flex items-center gap-3 rounded-full border border-white/35 bg-[linear-gradient(135deg,rgba(186,12,47,0.94),rgba(254,80,0,0.68))] px-6 py-4 font-bold text-white shadow-[0_10px_24px_rgba(186,12,47,0.25)]"
        >
          <Mail className="size-5" />
          contacto@amscubing.org
          <Send className="size-4" />
        </a>
      </div>
    </section>
  );
}
