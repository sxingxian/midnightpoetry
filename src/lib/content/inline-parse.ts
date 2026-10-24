/**
 * Tiny, safe inline formatter for guide text: **bold**, *italic* and
 * [label](https://link or /path). Produces tokens only — never HTML strings.
 */
export type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "link"; text: string; href: string };

const PATTERN = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]{1,200})\]\(([^)\s]{1,500})\)/g;

export function safeHref(href: string): string | null {
  // Browsers treat "\" like "/" and ignore control characters, so "/\evil.com" would leave the site.
  if (/[\\\x00-\x20\x7f]/.test(href)) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const u = new URL(href);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
}

export function tokenize(input: string): InlineToken[] {
  const out: InlineToken[] = [];
  let last = 0;
  for (const m of input.matchAll(PATTERN)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ kind: "text", text: input.slice(last, i) });
    if (m[1] !== undefined) out.push({ kind: "strong", text: m[1] });
    else if (m[2] !== undefined) out.push({ kind: "em", text: m[2] });
    else if (m[3] !== undefined && m[4] !== undefined) {
      const href = safeHref(m[4]);
      out.push(href ? { kind: "link", text: m[3], href } : { kind: "text", text: m[3] });
    }
    last = i + m[0].length;
  }
  if (last < input.length) out.push({ kind: "text", text: input.slice(last) });
  return out;
}
