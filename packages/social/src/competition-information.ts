const BOILERPLATE_CUTOFFS = [
  /esta\s+competencia\s+es\s+reconocida/i,
  /aviso\s+de\s+filmaci[oó]n/i,
  /notice\s+of\s+filming/i,
];

/**
 * Extract a plain-text Spanish welcome intro from WCA competition information
 * markdown. Prefer the Español section; stop before English / AMS boilerplate.
 */
export function extractSpanishIntroFromInformation(
  information: string | null | undefined,
): string | null {
  if (!information?.trim()) {
    return null;
  }

  const spanishSection = isolateSpanishSection(information);
  const withoutImages = stripMarkdownImages(spanishSection);
  const withoutHeadings = withoutImages
    .split(/\r?\n/)
    .filter((line) => !/^\s*#{1,6}\s/.test(line))
    .join("\n");
  const withPlainLinks = withoutHeadings.replace(
    /\[([^\]]+)\]\([^)]+\)/g,
    "$1",
  );
  const withoutEmphasis = withPlainLinks
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1");

  let plain = withoutEmphasis;
  for (const pattern of BOILERPLATE_CUTOFFS) {
    const match = pattern.exec(plain);
    if (match?.index != null) {
      plain = plain.slice(0, match.index);
    }
  }

  const collapsed = plain.replace(/\s+/g, " ").trim();
  return collapsed.length > 0 ? collapsed : null;
}

function isolateSpanishSection(markdown: string): string {
  const espanolMatch = /#{1,6}\s*Espa[nñ]ol\b/i.exec(markdown);
  const start = espanolMatch
    ? espanolMatch.index + espanolMatch[0].length
    : 0;
  const afterStart = markdown.slice(start);
  const englishMatch = /#{1,6}\s*English\b/i.exec(afterStart);
  return englishMatch
    ? afterStart.slice(0, englishMatch.index)
    : afterStart;
}

function stripMarkdownImages(text: string): string {
  let result = "";
  let searchFrom = 0;
  const marker = "![";

  while (searchFrom < text.length) {
    const bangIndex = text.indexOf(marker, searchFrom);
    if (bangIndex === -1) {
      result += text.slice(searchFrom);
      break;
    }

    result += text.slice(searchFrom, bangIndex);

    const afterAltStart = bangIndex + marker.length;
    const altEnd = text.indexOf("](", afterAltStart);
    if (altEnd === -1) {
      result += text.slice(bangIndex);
      break;
    }

    const urlStart = altEnd + 2;
    const urlEnd = findMarkdownLinkUrlEnd(text, urlStart);
    if (urlEnd === -1) {
      result += text.slice(bangIndex, urlStart);
      searchFrom = urlStart;
      continue;
    }

    searchFrom = urlEnd + 1;
  }

  return result;
}

function findMarkdownLinkUrlEnd(text: string, urlStart: number): number {
  let depth = 0;

  for (let i = urlStart; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") {
      depth += 1;
      continue;
    }
    if (ch === ")") {
      if (depth === 0) {
        return i;
      }
      depth -= 1;
      continue;
    }
    if (ch === "\n") {
      return -1;
    }
  }

  return -1;
}
