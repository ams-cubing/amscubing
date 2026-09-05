import Image from "next/image";
import { ArrowRight, BookOpen, GraduationCap } from "lucide-react";
import { blogPosts, COURSES_URL } from "@/lib/content";

export function BlogTeaser() {
  return (
    <section id="blog" className="bg-[var(--ams-soft)] py-24 md:py-32">
      <div className="ams-container">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="ams-heading mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--ams-red)]">
              Comunidad
            </p>
            <h2 className="ams-display text-[clamp(2rem,5vw,3.75rem)] leading-none">
              Blog AMS
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-black/65">
            Guías, historia y contexto para vivir mejor el speedcubing en
            México.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {blogPosts.map((post, index) => (
            <a
              key={post.href}
              href={post.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group ams-slash-card ${
                index === 1 ? "ams-slash-card-right" : ""
              } overflow-hidden bg-white shadow-[0_16px_34px_rgba(1,11,25,0.1)] transition-transform hover:-translate-y-1`}
            >
              <div className="relative h-52">
                <Image
                  src={post.image}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
                <span className="absolute left-0 top-0 bg-[var(--ams-orange)] px-4 py-2 text-xs font-bold uppercase text-white [clip-path:polygon(0_0,100%_0,88%_100%,0_100%)]">
                  {post.date}
                </span>
              </div>
              <div className="p-6">
                <BookOpen className="mb-5 size-6 text-[var(--ams-red)]" />
                <h3 className="ams-heading text-xl font-bold leading-tight transition-colors group-hover:text-[var(--ams-red)]">
                  {post.title}
                </h3>
                <p className="mt-4 text-base leading-7 text-black/65">
                  {post.excerpt}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 font-bold text-[var(--ams-green)]">
                  Saber más
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </a>
          ))}
        </div>

        <div className="relative mt-16 overflow-hidden bg-[var(--ams-red)] px-6 py-12 text-center text-white md:px-12">
          <div className="absolute inset-0 opacity-10 [background-image:url('/source/isotipo-color-sm.png')] [background-size:92px_auto]" />
          <div className="relative mx-auto max-w-3xl">
            <GraduationCap className="mx-auto mb-5 size-9" />
            <h3 className="ams-display text-[clamp(2rem,5vw,3.8rem)] leading-none">
              Capacitación de staff
            </h3>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/85">
              Los cursos siguen como producto separado de WordPress mientras el
              sitio público migra al monorepo.
            </p>
            <a
              href={COURSES_URL}
              className="ams-glass mt-8 inline-flex items-center gap-2 rounded-full border border-white/35 bg-[linear-gradient(135deg,rgba(0,154,68,0.95),rgba(0,154,68,0.62))] px-6 py-4 font-bold text-white"
            >
              Ir a cursos
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
