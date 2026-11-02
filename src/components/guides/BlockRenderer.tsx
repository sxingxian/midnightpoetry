import { Fragment, type ReactNode } from "react";
import type { Block } from "@/lib/content/blocks";
import { headingId } from "@/lib/content/blocks";
import { Inline, safeHref } from "@/lib/content/inline";

export type TocItem = { id: string; text: string };

export function buildToc(blocks: Block[]): TocItem[] {
  const used = new Set<string>();
  return blocks.filter((b): b is Extract<Block, { type: "heading" }> => b.type === "heading").map((b) => ({ id: headingId(b.text, used), text: b.text }));
}

/**
 * Renders guide blocks. `inlineAd` is placed before the 3rd section heading
 * (i.e. after the 2nd section), never above the first heading and never inside
 * a table or other block.
 */
export function BlockRenderer({ blocks, supabaseUrl, inlineAd }: { blocks: Block[]; supabaseUrl: string; inlineAd?: ReactNode }) {
  const used = new Set<string>();
  let headings = 0;
  let adPlaced = false;
  const out: ReactNode[] = [];

  blocks.forEach((b, i) => {
    if (b.type === "heading") {
      headings++;
      if (headings === 3 && inlineAd && !adPlaced) {
        out.push(<Fragment key="ad">{inlineAd}</Fragment>);
        adPlaced = true;
      }
    }
    out.push(<Fragment key={i}>{renderBlock(b, used, supabaseUrl)}</Fragment>);
  });
  // Short guides: put the ad near the end rather than not at all, but only if there was at least one heading.
  if (inlineAd && !adPlaced && headings >= 1 && blocks.length >= 4) out.splice(out.length - 1, 0, <Fragment key="ad">{inlineAd}</Fragment>);
  return <>{out}</>;
}

function renderBlock(b: Block, used: Set<string>, supabaseUrl: string): ReactNode {
  switch (b.type) {
    case "heading":
      return <h2 id={headingId(b.text, used)}>{b.text}</h2>;
    case "paragraph":
      return (
        <p>
          <Inline text={b.text} />
        </p>
      );
    case "list": {
      const items = b.items.map((it, i) => (
        <li key={i}>
          <Inline text={it} />
        </li>
      ));
      return b.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
    }
    case "callout":
      return (
        <aside className="callout" aria-label={b.title || "Note"}>
          {b.title ? <p className="eyebrow">{b.title}</p> : null}
          <p>
            <Inline text={b.text} />
          </p>
        </aside>
      );
    case "table":
      return (
        <div className="table-wrap">
          <table>
            {b.caption ? <caption>{b.caption}</caption> : null}
            <thead>
              <tr>
                {b.header.map((h, i) => (
                  <th key={i} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) =>
                    j === 0 ? (
                      <th key={j} scope="row" style={{ fontWeight: 500 }}>
                        <Inline text={c} />
                      </th>
                    ) : (
                      <td key={j}>
                        <Inline text={c} />
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "faq":
      return (
        <div className="faq">
          {b.items.map((it, i) => (
            <details key={i} open={i === 0}>
              <summary>{it.q}</summary>
              <p>
                <Inline text={it.a} />
              </p>
            </details>
          ))}
        </div>
      );
    case "image":
      return (
        <figure className="figure">
          {/* eslint-disable-next-line @next/next/no-img-element -- re-encoded WebP from storage */}
          <img src={`${supabaseUrl}/storage/v1/object/public/media/${b.path}`} alt={b.alt} loading="lazy" decoding="async" />
          {b.caption ? <figcaption>{b.caption}</figcaption> : null}
        </figure>
      );
    case "cta": {
      const href = safeHref(b.url);
      return (
        <aside className="cta-block" aria-label={b.title}>
          <div>
            <p className="t" style={{ margin: 0 }}>
              {b.title}
            </p>
            {b.text ? <p style={{ margin: "6px 0 0", fontSize: 15, opacity: 0.8 }}>{b.text}</p> : null}
          </div>
          {href ? (
            <a className="btn press" href={href}>
              {b.label}
            </a>
          ) : null}
        </aside>
      );
    }
  }
}
