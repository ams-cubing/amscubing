import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, BookOpen } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { blogPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Blog | Asociación Mexicana de Speedcubing",
  description:
    "Guías, noticias y contexto para vivir mejor el speedcubing en México.",
};

export default function BlogPage() {
  return (
    <main>
      <SiteNav active="Blog" />
      <PageHero
        eyebrow="Comunidad"
        title="Blog AMS"
        description="Historias, guías y contenido para competidores, familias, voluntarios y organizadores."
      />
      <section className="bg-[var(--ams-soft)] py-20 md:py-24">
        <div className="ams-container">
          <div className="grid gap-6 lg:grid-cols-3">
            {blogPosts.map((post, index) => (
              <a
                key={post.href}
                href={post.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group overflow-hidden bg-white shadow-[0_16px_34px_rgba(1,11,25,0.1)] transition-transform hover:-translate-y-1 ${
                  index === 1 ? "ams-slash-card-right" : "ams-slash-card"
                }`}
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
                  <h2 className="ams-heading text-xl font-bold leading-tight transition-colors group-hover:text-[var(--ams-red)]">
                    {post.title}
                  </h2>
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
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
