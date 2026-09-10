import { Mail, Send } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { CONTACT_EMAIL } from "@/lib/content";

export function Contacto() {
  return (
    <section id="contacto" className="bg-white py-20">
      <div className="ams-container flex flex-col items-start justify-between gap-8 border-l-4 border-ams-green bg-ams-soft p-7 md:flex-row md:items-center md:p-10">
        <div>
          <p className="ams-heading mb-3 text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
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
        <Button
          asChild
          size="lg"
          variant="destructive"
          className="ams-glass border border-white/35"
        >
          <a href={`mailto:${CONTACT_EMAIL}`}>
            <Mail className="size-5" />
            contacto@amscubing.org
            <Send className="size-4" />
          </a>
        </Button>
      </div>
    </section>
  );
}
