"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { blogPosts } from "@/lib/content";

export function BlogTeaser() {
  return (
    <section className="bg-[var(--ams-mist)] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="max-w-2xl"
        >
          <p className="text-sm font-semibold tracking-wide text-[var(--ams-green)] uppercase">
            Blog
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Conoce nuestro blog
          </h2>
          <p className="mt-5 text-base leading-relaxed text-black/70 md:text-lg">
            Guías, historia y contexto para vivir mejor el speedcubing en
            México.
          </p>
        </motion.div>

        <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {blogPosts.map((post, index) => (
            <motion.li
              key={post.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
            >
              <a
                href={post.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full outline-none"
              >
                <p className="text-xs font-medium tracking-wide text-black/45 uppercase">
                  {post.date}
                </p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-balance transition-colors group-hover:text-[var(--ams-green)] group-focus-visible:text-[var(--ams-green)]">
                  {post.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-black/65">
                  {post.excerpt}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ams-green)]">
                  Saber más
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
