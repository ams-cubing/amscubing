export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="relative overflow-hidden bg-[var(--ams-navy)] py-20 text-white md:py-24">
      <div className="ams-texture absolute inset-0 opacity-25" />
      <div className="absolute -right-28 -top-36 h-[26rem] w-[26rem] rotate-[10deg] bg-[var(--ams-red)] opacity-85 [clip-path:polygon(50%_0%,100%_40%,80%_100%,20%_90%)]" />
      <div className="ams-container relative">
        <p className="ams-heading mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--ams-orange)]">
          {eyebrow}
        </p>
        <h1 className="ams-display max-w-5xl text-[clamp(2.6rem,7vw,5rem)] leading-none">
          {title}
        </h1>
        <p className="ams-copy mt-5 max-w-2xl text-lg leading-8 text-white/78">
          {description}
        </p>
      </div>
    </section>
  );
}
