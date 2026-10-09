import { describe, it, expect } from "vitest";
import { cleanHtml, validateSections, videoEmbed } from "./content";
import { convertWordpress } from "./wordpress";
import { canManageBlog } from "./permissions";
describe("Blog editorial", () => {
  it("preserves WordPress expandable headings and CTA links", () => {
    const sections = convertWordpress(
      '<details><summary>Antes de competir</summary><p>Prepara tus cubos</p><div><a class="wp-block-button__link" href="https://example.com">Competencias</a></div></details>',
      5,
    );
    expect(sections[0]?.blocks.map((b) => b.type)).toEqual([
      "heading",
      "html",
      "button",
    ]);
    expect(sections[0]?.blocks[2]?.text).toBe("Competencias");
  });
  it("uses scoped editorial permissions", () => {
    expect(canManageBlog("user", "editor")).toBe(true);
    expect(canManageBlog("editor", null)).toBe(false);
    expect(canManageBlog("user", "instructor")).toBe(false);
    expect(canManageBlog("delegate", null)).toBe(true);
  });
  it("strips custom identity and executable content", () => {
    const html = cleanHtml(
      '<p style="color:purple;font-family:Comic Sans" class="custom" onclick="alert(1)">Hola <strong>AMS</strong></p><script>alert(1)</script><iframe src="https://evil.example/x"></iframe>',
    );
    expect(html).toContain("<strong>AMS</strong>");
    expect(html).not.toMatch(/purple|Comic|class=|onclick|script|evil/);
  });
  it("rejects forged palettes and fonts", () => {
    expect(() =>
      validateSections([
        { id: "s", background: "purple", columns: 1, blocks: [] },
      ]),
    ).toThrow();
    expect(() =>
      validateSections([
        {
          id: "s",
          background: "white",
          columns: 1,
          font: "Comic Sans",
          blocks: [],
        },
      ]),
    ).toThrow();
  });
  it("rejects script URLs and unsupported videos", () => {
    for (const [type, url] of [
      ["button", "javascript:alert(1)"],
      ["image", "data:image/svg+xml,x"],
      ["video", "https://evil.example/video"],
    ])
      expect(() =>
        validateSections([
          {
            id: "s",
            background: "white",
            columns: 1,
            blocks: [{ id: "b", type, text: "x", url }],
          },
        ]),
      ).toThrow();
  });
  it("does not duplicate nested WordPress paragraphs and lists", () => {
    const sections = convertWordpress(
      '<div class="elementor"><h2>Guía</h2><p>Introducción <strong>AMS</strong></p><ul><li><p>Primero</p></li><li>Segundo</li></ul><figure><img src="https://example.com/a.jpg"/><figcaption>Recuerdo</figcaption></figure></div>',
      10,
    );
    const content = JSON.stringify(sections);
    expect(content.match(/Primero/g)).toHaveLength(1);
    expect(content).toContain("Recuerdo");
    expect(sections[0]?.blocks).toHaveLength(4);
  });
  it("keeps headings, media and readable sections", () => {
    const sections = convertWordpress(
      '<p>Intro</p><h2>Historia</h2><p>Texto</p><h3>Detalle</h3><img src="https://example.com/a.jpg" alt="Foto"/>',
      3,
    );
    expect(sections).toHaveLength(2);
    expect(sections[1]?.blocks.map((b) => b.type)).toEqual([
      "heading",
      "html",
      "heading",
      "image",
    ]);
  });
  it("normalizes trusted video providers", () => {
    expect(videoEmbed("https://youtu.be/abc_123")).toBe(
      "https://www.youtube-nocookie.com/embed/abc_123",
    );
    expect(videoEmbed("https://vimeo.com/123")).toBe(
      "https://player.vimeo.com/video/123",
    );
    expect(
      videoEmbed("https://youtube.com.evil.example/watch?v=abc"),
    ).toBeNull();
  });
  it("rejects duplicate identifiers", () => {
    expect(() =>
      validateSections([
        {
          id: "same",
          background: "white",
          columns: 1,
          blocks: [{ id: "same", type: "text", text: "Hola" }],
        },
      ]),
    ).toThrow();
  });
});
