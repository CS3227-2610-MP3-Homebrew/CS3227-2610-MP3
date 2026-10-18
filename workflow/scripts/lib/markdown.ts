// Minimal Markdown helpers for workflow checks: no rendering, only the parts
// that link and heading validation need. Line numbers are 1-based.

// Built at runtime because the TypeScript target predates Unicode property escapes.
const slugUnsafe = new RegExp("[^\\p{L}\\p{M}\\p{N}\\p{Pc} -]", "gu");

export interface MarkdownLink {
  target: string;
  line: number;
}

/** Blank out fenced code blocks and HTML comments, keeping line numbers stable. */
export function proseLines(text: string): string[] {
  const withoutComments = text.replace(/<!--[\s\S]*?-->/g, (comment) =>
    comment.replace(/[^\n]/g, " "),
  );
  let fence: string | undefined;
  return withoutComments.split(/\r?\n/).map((line) => {
    const marker = line.match(/^\s*(```+|~~~+)/)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = undefined;
      return "";
    }
    if (marker) {
      fence = marker;
      return "";
    }
    return line;
  });
}

/** GitHub's anchor for one heading's text, before duplicate suffixes. */
export function slugify(heading: string): string {
  return heading
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .toLowerCase()
    .replace(slugUnsafe, "")
    .replace(/ /g, "-");
}

/** GitHub-compatible heading anchors, including -1, -2 suffixes for duplicates. */
export function headingSlugs(text: string): Set<string> {
  const slugs = new Set<string>();
  const seen = new Map<string, number>();
  for (const line of proseLines(text)) {
    const heading = line.match(/^#{1,6}\s+(.*?)\s*#*\s*$/)?.[1];
    if (heading === undefined) continue;
    const base = slugify(heading);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    slugs.add(count ? `${base}-${count}` : base);
  }
  for (const match of text.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) slugs.add(match[1]);
  return slugs;
}

/** Inline and image link targets outside code blocks, inline code and comments. */
export function markdownLinks(text: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  proseLines(text).forEach((line, index) => {
    const prose = line.replace(/(`+)[\s\S]*?\1/g, "");
    for (const match of prose.matchAll(/!?\[(?:[^\[\]]|\[[^\]]*\])*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
      links.push({ target: match[1], line: index + 1 });
    }
  });
  return links;
}
