import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Aviso de privacidad | Asociación Mexicana de Speedcubing",
  description:
    "Aviso de privacidad de la Asociación Mexicana de Speedcubing A.C.",
};

const sections = [
  {
    title: "Cumplimiento legal",
    tone: "light",
    body: [
      "En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (“LFPDPPP”), publicada en el Diario Oficial de la Federación el 20 de marzo de 2025, la Asociación Mexicana de Speedcubing, A.C. emite el presente aviso de privacidad (el “Aviso de Privacidad”).",
    ],
  },
  {
    title: "Responsables del tratamiento de sus datos personales",
    tone: "light",
    body: [
      "Para efectos del Aviso de Privacidad, la Asociación Mexicana de Speedcubing, A.C. (la “AMS” y/o la “Responsable”), con domicilio en la Ciudad de México, se entenderá como “Responsable” de conformidad con lo establecido en la LFPFPPP, a fin de llevar a cabo el tratamiento de datos personales según lo señalado más adelante.",
      "Asimismo, a fin de atender y resolver cualquier duda, aclaración y/o solicitud relacionada con el Aviso de Privacidad, se señala a Areli Rubí Gordillo Martínez, con el mismo domicilio y correo electrónico derechos-arco@amscubing.org.",
    ],
  },
  {
    title: "Datos personales que podemos recabar",
    tone: "dark",
    body: [
      "Los datos que obtiene la Responsable y que les pertenecen a las personas que los proporcionan (el “Titular”) incluyen datos de identificación y contacto, datos relacionados a su perfil de la WCA, e imagen, voz y/o nombres captados en fotografía, video y/o grabación de audio.",
      "El Titular está de acuerdo en que no ha proporcionado y en ningún caso proporcionará a la Responsable “datos personales sensibles”, es decir, aquellos datos personales íntimos o cuya utilización debida o indebida pueda dar origen a discriminación o conlleve un riesgo grave para este.",
      "En particular, el Titular se obliga a no proporcionar a la Responsable ningún dato relativo a origen racial o étnico, estado de salud presente o futura, información genética, creencias religiosas, filosóficas y morales, afiliación sindical, opiniones políticas o preferencia sexual.",
    ],
  },
  {
    title: "Finalidad del tratamiento de sus datos personales",
    tone: "light",
    body: [
      "Como finalidad primaria, los datos personales del Titular son recolectados para mantener informadas a las personas interesadas, donantes, instituciones privadas y gubernamentales, educativas y afines sobre las actividades que la AMS realiza, coordina y apoya.",
      "Como finalidad secundaria, los datos personales del Titular se utilizarán en reportes, medios impresos, digitales, audiovisuales, eventos, publicaciones en redes sociales de la AMS, seminarios, material institucional, talleres, estadísticas y campañas a fin de dar publicidad, difundir y promover el deporte del speedcubing y fortalecer la comunidad.",
    ],
  },
  {
    title: "Derechos de imagen",
    tone: "orange",
    body: [
      "Al asistir a eventos organizados por la AMS, el Titular autoriza de manera tácita y gratuita la captación y uso de su imagen, voz y/o nombre, con carácter irrevocable, no exclusivo, por tiempo indefinido, para su difusión en cualquier medio físico o digital.",
      "El Titular reconoce que no recibirá contraprestación económica por este uso y que la AMS conservará la propiedad de los materiales generados.",
    ],
  },
  {
    title: "Transferencia de datos personales",
    tone: "light",
    body: [
      "La AMS no transferirá datos personales a terceros sin el consentimiento expreso del Titular, salvo en los casos previstos por las leyes aplicables.",
    ],
  },
  {
    title: "Derechos ARCO",
    tone: "green",
    body: [
      "El Titular puede ejercer sus derechos de acceso, rectificación, cancelación u oposición de datos personales enviando una solicitud al correo electrónico derechos-arco@amscubing.org.",
      "Si el Titular no desea que su imagen sea utilizada para los fines previstos en el presente Aviso de Privacidad, deberá notificarlo antes de participar en algún evento de la AMS.",
    ],
  },
  {
    title: "Aceptación tácita del aviso de privacidad",
    tone: "dark",
    body: [
      "La asistencia y permanencia en los eventos organizados por la AMS implica que el Titular manifiesta su consentimiento tácito para la recopilación y tratamiento de sus datos personales, incluyendo el tratamiento irrevocable de derechos de imagen en los términos descritos en el Aviso de Privacidad.",
      "La presencia en el evento implica que el Titular ha leído, comprendido y aceptado los términos y condiciones del Aviso de Privacidad.",
    ],
  },
  {
    title: "Modificaciones al aviso de privacidad",
    tone: "light",
    body: [
      "Cualquier modificación al presente aviso le será notificada por el responsable a través del sitio de internet www.amscubing.org. El titular podrá visitar periódicamente en dicho sitio la versión más actualizada del Aviso de Privacidad.",
    ],
  },
] as const;

export default function AvisoDePrivacidadPage() {
  return (
    <main>
      <SiteNav />
      <PageHero
        eyebrow="Transparencia y datos"
        title="Aviso de privacidad"
        description="Aviso de Privacidad Integral de la Asociación Mexicana de Speedcubing, A.C., adaptado al nuevo estilo visual del sitio."
      />
      <section className="bg-white py-16 md:py-20">
        <div className="ams-container flex max-w-[1100px] flex-col gap-6">
          {sections.map((section) => (
            <article
              key={section.title}
              className={`rounded-[20px] p-8 md:p-10 ${getSectionClassName(
                section.tone,
              )}`}
            >
              <h2
                className={`ams-display mb-4 text-2xl ${
                  section.tone === "light"
                    ? "text-[var(--ams-red)]"
                    : section.tone === "dark"
                      ? "text-[var(--ams-orange)]"
                      : "text-white"
                }`}
              >
                {section.title}
              </h2>
              <div className="grid gap-4">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className={`ams-copy text-base leading-8 ${
                      section.tone === "light"
                        ? "text-black/72"
                        : "text-white/84"
                    }`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function getSectionClassName(tone: (typeof sections)[number]["tone"]) {
  switch (tone) {
    case "dark":
      return "ams-texture bg-[var(--ams-navy)] text-white";
    case "orange":
      return "bg-[var(--ams-orange)] text-white";
    case "green":
      return "bg-[var(--ams-green)] text-white";
    default:
      return "bg-[var(--ams-soft)] text-[var(--ams-navy)]";
  }
}
