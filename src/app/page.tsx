import Link from "next/link";
import { NightSky } from "@/components/landing/NightSky";
import { ScrollFx } from "@/components/landing/ScrollFx";
import SplitText from "@/components/vendor/react-bits/SplitText";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getCategories, getLiveProducts, getPublishedGuides } from "@/lib/content/queries";
import type { Product } from "@/lib/content/types";
import { readableOn } from "@/lib/ads";

export const dynamic = "force-dynamic";

const POEM: [string, string][] = [
  ["When the day lets go of me,", "the quiet begins to talk."],
  ["Nobody watches the work at midnight,", "so it has no reason to lie."],
  ["These are the hours the world gave up.", "I took them, and they built me."],
  ["An idea comes like a lit window", "in a city I thought was asleep."],
  ["I am not chasing the sound of a poem.", "I keep the lamp on until it finds me."],
  ["So I build the way a poem speaks:", "slowly, honestly, and after dark."],
];
const NIGHT_TIMES = ["21:40", "23:05", "00:30", "02:15", "03:50", "05:20"];
const NIGHT_LABELS = ["DUSK", "LATE", "MIDNIGHT", "SMALL HOURS", "BEFORE DAWN", "FIRST LIGHT"];
const DAY_TIMES = ["07:30", "09:10", "11:45", "13:20", "15:50", "17:40"];
const DAY_LABELS = ["MORNING", "MID-MORNING", "NOON", "AFTERNOON", "LATE AFTERNOON", "GOLDEN HOUR"];

async function loadProducts(): Promise<Product[]> {
  try {
    return await getLiveProducts();
  } catch {
    return []; // the poem still renders if the database is unreachable
  }
}

type GuideDoor = { slug: string; name: string; topics: string; count: number };

/** One door per live product that has published guides — all of them on this site. */
async function loadGuideDoors(products: Product[]): Promise<GuideDoor[]> {
  try {
    const [guides, categories] = await Promise.all([getPublishedGuides(), getCategories()]);
    const catName = new Map(categories.map((c) => [c.id, c.name]));
    return products
      .map((p) => {
        const mine = guides.filter((g) => g.product_id === p.id);
        const topics = [...new Set(mine.map((g) => catName.get(g.category_id ?? "")).filter(Boolean))].slice(0, 3).join(", ");
        return { slug: p.slug, name: p.name, topics: topics || p.kind, count: mine.length };
      })
      .filter((d) => d.count > 0);
  } catch {
    return [];
  }
}

function ProductCard({ p, delay }: { p: Product; delay: number }) {
  const style = {
    "--pa": p.accent_dark,
    "--pb": p.button_dark,
    "--pbf": readableOn(p.button_dark),
    "--pa-l": p.accent_light,
    "--pb-l": p.button_light,
    "--pbf-l": readableOn(p.button_light),
  } as React.CSSProperties;
  return (
    <article className="product-card" data-rv="" data-d={delay} style={style}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span className="kind product-accent">
          {p.name} · {p.kind}
        </span>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          LIVE
        </span>
      </div>
      <h3 className={p.headline_style === "sans" ? "sans" : "serif"}>
        {p.headline} {p.headline_style === "sans" ? <span className="product-accent">{p.headline_em}</span> : <em className="product-accent">{p.headline_em}</em>}
      </h3>
      <p>{p.description}</p>
      {p.highlights.length ? (
        <dl>
          {p.highlights.map((h) => (
            <div key={h.label}>
              <dt>{h.label}</dt>
              <dd>{h.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {p.cta_url ? (
        <div style={{ marginTop: 6 }}>
          <a className="btn press product-btn" href={p.cta_url}>
            {p.cta_label}
          </a>
        </div>
      ) : null}
    </article>
  );
}

export default async function Home() {
  const products = await loadProducts();
  const doors = await loadGuideDoors(products);

  return (
    <div className="landing">
      <a href="#made" className="skip">
        Skip to products
      </a>
      <NightSky />
      <ScrollFx />
      <SiteHeader overlay current="products" sceneToggle />

      <main style={{ position: "relative", zIndex: 1 }}>
        <section id="top" className="hero wrap">
          <p className="eyebrow glow">
            <span className="when-dark">Midnight Poetry Studio · 21:10, lights on</span>
            <span className="when-light">Midnight Poetry Studio · 07:00, lamp off</span>
          </p>
          <h1 className="glow">
            <SplitText tag="span" text="Ideas arrive late." splitType="words" effect="blur" trigger="load" textAlign="left" delay={90} duration={1.1} />{" "}
            <em>
              <SplitText tag="span" text="Stay up with them." splitType="words" effect="blur" trigger="load" textAlign="left" delay={90} duration={1.1} />
            </em>
          </h1>
          <p className="intro glow">
            <span className="when-dark">Scroll and the night goes by — dusk, midnight, the small hours, first light. Whatever got made overnight is waiting at dawn.</span>
            <span className="when-light">Scroll and the day goes by — morning, noon, the long afternoon. Whatever got made is waiting at golden hour.</span>
          </p>
        </section>

        <section aria-label="The poem" className="wrap">
          {POEM.map(([a, b], i) => (
            <article key={i} className="stanza" data-rv="">
              <p className="when glow">
                <span className="when-dark">
                  <time>{NIGHT_TIMES[i]}</time>
                  <small>{NIGHT_LABELS[i]}</small>
                </span>
                <span className="when-light">
                  <time>{DAY_TIMES[i]}</time>
                  <small>{DAY_LABELS[i]}</small>
                </span>
              </p>
              <p className="lines glow">
                {a}
                <em>{b}</em>
              </p>
            </article>
          ))}
        </section>

        <section id="made" aria-labelledby="made-h" className="made wrap">
          <p className="eyebrow glow" data-rv="" style={{ fontSize: 13 }}>
            <span className="when-dark">06:00 · DAWN</span>
            <span className="when-light">18:30 · GOLDEN HOUR</span>
          </p>
          <h2 id="made-h" className="glow" data-rv="" data-d="80" style={{ marginTop: 14 }}>
            <span className="when-dark">
              Morning. Here&apos;s what got made <em className="accent-em">overnight.</em>
            </span>
            <span className="when-light">
              Evening. Here&apos;s what got made <em className="accent-em">today.</em>
            </span>
          </h2>
          {products.length ? (
            <div className="product-grid" data-count={products.length}>
              {products.map((p, i) => (
                <ProductCard key={p.id} p={p} delay={i * 80} />
              ))}
            </div>
          ) : (
            <p className="glow" style={{ marginTop: 40, color: "var(--ink-2)" }}>
              The products are being polished. Come back at dawn.
            </p>
          )}
        </section>

        {doors.length ? (
          <section id="guides" aria-labelledby="guides-h" className="wrap" style={{ position: "relative", zIndex: 1, paddingTop: 90, paddingBottom: 40 }}>
            <h2 id="guides-h" className="serif glow" data-rv="" style={{ margin: 0, fontSize: "clamp(32px, 3.6vw, 48px)", lineHeight: 1.06 }}>
              Need a hand? <em className="accent-em">Every guide lives here.</em>
            </h2>
            <div className="guide-doors" data-count={doors.length}>
              {doors.map((d, i) => (
                <Link key={d.slug} href={`/guides?product=${d.slug}`} className="door lift" data-rv="" data-d={String(i * 80)}>
                  <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span className="eyebrow" style={{ fontSize: 11 }}>
                      {d.name} guides · {d.count === 1 ? "1 guide" : `${d.count} guides`}
                    </span>
                    <span className="t">{d.topics}</span>
                  </span>
                  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
