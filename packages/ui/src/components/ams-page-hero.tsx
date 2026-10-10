import type { ReactNode } from "react";

export function AmsPageHero({
  eyebrow,
  title,
  description,
  children,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={`relative overflow-hidden bg-ams-navy text-white ${compact ? "py-10 md:py-12" : "py-20 md:py-24"}`}
    >
      <div className="ams-texture absolute inset-0 opacity-25" />
      <div
        className={`absolute rotate-[10deg] bg-ams-red opacity-85 [clip-path:polygon(50%_0%,100%_40%,80%_100%,20%_90%)] ${compact ? "-right-24 -top-40 h-[18rem] w-[18rem]" : "-right-28 -top-36 h-[26rem] w-[26rem]"}`}
      />
      <div className="ams-container relative">
        <p className="ams-heading mb-3 text-sm font-bold uppercase tracking-[0.12em] text-ams-orange">
          {eyebrow}
        </p>
        <h1
          className={`ams-display max-w-5xl leading-none ${compact ? "text-[clamp(2rem,5vw,3.5rem)]" : "text-[clamp(2.6rem,7vw,5rem)]"}`}
        >
          {title}
        </h1>
        {description ? (
          <p
            className={`ams-copy max-w-2xl text-white/78 ${compact ? "mt-3 text-base leading-7" : "mt-5 text-lg leading-8"}`}
          >
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}
