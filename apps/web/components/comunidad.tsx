const testimonials = [
  {
    initials: "RI",
    name: "Renata Ibarra",
    meta: "@renata_cubes · Puebla",
    quote:
      "Mi primer torneo fue con la AMS. Llegué sin conocer a nadie y salí con un grupo de amigos que compiten conmigo hasta hoy.",
    color: "bg-[var(--ams-red)]",
  },
  {
    initials: "ID",
    name: "Iker Domínguez",
    meta: "@iker_wca · CDMX",
    quote:
      "Ser voluntario me enseñó a organizar torneos oficiales WCA desde cero. Hoy comparto eso con la siguiente generación.",
    color: "bg-[var(--ams-orange)]",
  },
  {
    initials: "LM",
    name: "Lucía Márquez",
    meta: "Mamá de competidor",
    quote:
      "Como mamá, lo que más valoro es la comunidad: siempre hay alguien cuidando a los más nuevos en cada competencia.",
    color: "bg-[var(--ams-green)]",
  },
] as const;

export function Comunidad() {
  return (
    <section id="comunidad" className="bg-[var(--ams-soft)] py-24">
      <div className="ams-container">
        <p className="ams-heading mb-2 text-sm font-bold uppercase tracking-[0.12em] text-[var(--ams-red)]">
          Comunidad
        </p>
        <h2 className="ams-display mb-10 text-[clamp(2rem,5vw,3.75rem)] leading-none">
          Lo que dice nuestra gente
        </h2>

        <div className="grid gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <article
              key={testimonial.name}
              className={`${
                index === 1 ? "ams-slash-card-right" : "ams-slash-card"
              } bg-white p-6 shadow-[0_16px_30px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-1`}
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`ams-display flex size-11 flex-none items-center justify-center rounded-full text-base text-white ${testimonial.color}`}
                >
                  {testimonial.initials}
                </div>
                <div>
                  <h3 className="ams-heading text-sm font-bold text-[var(--ams-navy)]">
                    {testimonial.name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-black/50">
                    {testimonial.meta}
                  </p>
                </div>
              </div>
              <p className="text-[15px] font-medium leading-7 text-[var(--ams-navy)]">
                {testimonial.quote}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
