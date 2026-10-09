import type { BlogSection } from "@workspace/db/schema";
import { cleanHtml, videoEmbed } from "@/lib/content";
export function Sections({ sections }: { sections: BlogSection[] }) {
  return (
    <div className="article-sections">
      {sections.map((section) => (
        <section
          key={section.id}
          className={`article-section tone-${section.background}`}
        >
          <div className={`section-grid columns-${section.columns}`}>
            {section.blocks.map((b) => (
              <div key={b.id} className={`block block-${b.type}`}>
                {b.type === "heading" &&
                  (b.level === 3 ? <h3>{b.text}</h3> : <h2>{b.text}</h2>)}
                {b.type === "text" && <p className="text-content">{b.text}</p>}
                {b.type === "quote" && (
                  <blockquote>
                    <p>{b.text}</p>
                    {b.caption && <cite>{b.caption}</cite>}
                  </blockquote>
                )}
                {b.type === "image" && (
                  <figure>
                    <img src={b.url} alt={b.text} loading="lazy" />
                    {b.caption && <figcaption>{b.caption}</figcaption>}
                  </figure>
                )}
                {b.type === "video" && videoEmbed(b.url ?? "") && (
                  <iframe
                    src={videoEmbed(b.url!)!}
                    title={b.text || "Video de la entrada"}
                    allowFullScreen
                    loading="lazy"
                  />
                )}
                {b.type === "button" && (
                  <a className="button" href={b.url}>
                    {b.text || "Leer más"} ↗
                  </a>
                )}
                {b.type === "divider" && <hr />}
                {b.type === "html" && (
                  <div
                    className="rich-content"
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
