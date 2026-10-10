import type { BlogSection } from "@workspace/db/schema";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { cleanHtml, videoEmbed } from "@/lib/content";

export const sectionToneClass: Record<BlogSection["background"], string> = {
  white: "bg-white text-ams-navy",
  soft: "bg-ams-soft text-ams-navy",
  navy: "bg-ams-navy text-white",
  red: "bg-ams-red text-white",
  green: "bg-ams-green text-white",
  orange: "bg-ams-orange text-ams-navy",
};

export const sectionColumnsClass: Record<BlogSection["columns"], string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
};

export const sectionClass = "px-4.5 py-6 sm:px-6 md:px-10.5 md:py-8";

/** Imported WordPress HTML can't carry classes, so its elements are styled from the wrapper. */
export const richContentClass =
  "[overflow-wrap:anywhere] [&_a]:text-ams-red [&_a]:underline [&_blockquote]:my-2.5 [&_blockquote]:border-l-[5px] [&_blockquote]:border-ams-red [&_blockquote]:bg-ams-navy/5 [&_blockquote]:p-6 [&_h2]:font-sans [&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:text-[clamp(1.3rem,2.6vw,2rem)] [&_h2]:font-bold [&_h3]:font-sans [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_iframe]:aspect-video [&_iframe]:w-full [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-sm [&_li]:ml-6 [&_ol]:mb-5.5 [&_ol]:list-decimal [&_p]:mb-5.5 [&_table]:block [&_table]:w-full [&_table]:overflow-auto [&_table]:border-collapse [&_table]:text-[15px] [&_td]:border [&_td]:border-ams-navy/20 [&_td]:p-2.5 [&_th]:border [&_th]:border-ams-navy/20 [&_th]:p-2.5 [&_ul]:mb-5.5 [&_ul]:list-disc";

export function Sections({ sections }: { sections: BlogSection[] }) {
  return (
    <div className="mx-auto my-8 max-w-250">
      {sections.map((section) => (
        <section
          key={section.id}
          className={cn(sectionClass, sectionToneClass[section.background])}
        >
          <div
            className={cn("grid gap-6", sectionColumnsClass[section.columns])}
          >
            {section.blocks.map((b) => (
              <div key={b.id} className="min-w-0">
                {b.type === "heading" &&
                  (b.level === 3 ? (
                    <h3 className="ams-heading mb-3 text-lg font-bold">
                      {b.text}
                    </h3>
                  ) : (
                    <h2 className="ams-heading mb-3 text-[clamp(1.3rem,2.6vw,2rem)] font-bold">
                      {b.text}
                    </h2>
                  ))}
                {b.type === "text" && (
                  <p className="whitespace-pre-wrap">{b.text}</p>
                )}
                {b.type === "quote" && (
                  <blockquote className="my-2.5 border-l-[5px] border-ams-red bg-ams-navy/5 p-6">
                    <p className="text-[23px]">{b.text}</p>
                    {b.caption && <cite>{b.caption}</cite>}
                  </blockquote>
                )}
                {b.type === "image" && (
                  <figure>
                    <img
                      src={b.url}
                      alt={b.text}
                      loading="lazy"
                      className="h-auto max-w-full rounded-sm"
                    />
                    {b.caption && (
                      <figcaption className="mt-2.5 text-sm opacity-70">
                        {b.caption}
                      </figcaption>
                    )}
                  </figure>
                )}
                {b.type === "video" && videoEmbed(b.url ?? "") && (
                  <iframe
                    src={videoEmbed(b.url!)!}
                    title={b.text || "Video de la entrada"}
                    allowFullScreen
                    loading="lazy"
                    className="aspect-video w-full border-0"
                  />
                )}
                {b.type === "button" && (
                  <a
                    className={buttonVariants({ variant: "destructive" })}
                    href={b.url}
                  >
                    {b.text || "Leer más"} ↗
                  </a>
                )}
                {b.type === "divider" && (
                  <hr className="border-0 border-t-2 border-current opacity-15" />
                )}
                {b.type === "html" && (
                  <div
                    className={richContentClass}
                    dangerouslySetInnerHTML={{ __html: cleanHtml(b.text) }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
