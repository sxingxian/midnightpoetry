import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { AdSenseScript, AdSlot, adsenseAllowed } from "@/components/guides/Ads";
import { getAdSettings, getCategories, getLiveProducts, getPublishedGuides, getRunningAds } from "@/lib/content/queries";
import { planAds } from "@/lib/ads";
import { productTheme } from "@/components/site/productTheme";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guides",
  description: "Plain advice for every Midnight Poetry app, written by the people who build them.",
  alternates: { canonical: "/guides" },
};

type Search = Promise<{ q?: string | string[]; product?: string | string[] }>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function GuidesPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 80);
  const productFilter = one(sp.product).slice(0, 60);

  const [products, categories, guides, settings, ads] = await Promise.all([getLiveProducts(), getCategories(), getPublishedGuides(), getAdSettings(), getRunningAds()]);
  const hostedProducts = products.filter((p) => guides.some((g) => g.product_id === p.id));
  const productById = new Map(products.map((p) => [p.id, p]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const selected = hostedProducts.find((p) => p.slug === productFilter);
  const needle = q.toLowerCase();
  const inProduct = guides.filter((g) => productById.has(g.product_id) && (!selected || g.product_id === selected.id));
  const shown = inProduct.filter((g) => !needle || g.title.toLowerCase().includes(needle) || g.standfirst.toLowerCase().includes(needle) || (categoryById.get(g.category_id ?? "")?.name.toLowerCase().includes(needle) ?? false));
  // "Start here": one per product first (so every product is represented), then any others, up to three.
  const starters = inProduct.filter((g) => g.start_here);
  const firstPerProduct = starters.filter((g, i) => starters.findIndex((x) => x.product_id === g.product_id) === i);
  const start = needle ? [] : [...firstPerProduct, ...starters.filter((g) => !firstPerProduct.includes(g))].slice(0, 3);

  const groups: { key: string; p: (typeof products)[number]; product: string; category: string; color: string; items: typeof shown }[] = [];
  for (const g of shown) {
    const p = productById.get(g.product_id)!;
    const c = categoryById.get(g.category_id ?? "");
    const key = `${p.id}:${c?.id ?? "-"}`;
    let grp = groups.find((x) => x.key === key);
    if (!grp) {
      grp = { key, p, product: p.name, category: c?.name ?? "General", color: p.accent_dark, items: [] };
      groups.push(grp);
    }
    grp.items.push(g);
  }

  const network = await adsenseAllowed();
  const plans = needle ? [] : planAds({ settings: settings && !network ? { ...settings, network_enabled: false } : settings, ads, spots: ["hub"], seed: "hub" });
  const href = (g: (typeof guides)[number]) => `/guides/${productById.get(g.product_id)!.slug}/${g.slug}`;

  return (
    <div className="page">
      <SiteHeader current="guides" />
      <main id="top" className="wrap" style={{ paddingTop: 28, paddingBottom: 96 }}>
        <nav aria-label="Breadcrumb" className="crumbs">
          <Link href="/">Midnight Poetry</Link> <span aria-hidden="true">›</span> <span aria-current="page">Guides</span>
        </nav>

        <div className="guides-hero">
          <div style={{ maxWidth: 780 }}>
            <p className="eyebrow" style={{ marginBottom: 16 }}>
              Studio guides
            </p>
            <h1>
              Plain advice, <em className="accent-em">written slowly.</em>
            </h1>
            <p style={{ margin: "20px 0 0", maxWidth: 600, fontSize: 18, lineHeight: 1.6, color: "var(--ink-2)" }}>
              Guides for the studio&apos;s apps, written by the people who build them. Each guide shows who wrote it and when it was last updated.
            </p>
          </div>
          <form method="get" action="/guides" role="search" className="field" style={{ flex: "0 1 340px" }}>
            <label htmlFor="gq">Search guides</label>
            <input id="gq" name="q" type="search" className="input" defaultValue={q} placeholder="e.g. swap a shift, GST" maxLength={80} />
            {selected ? <input type="hidden" name="product" value={selected.slug} /> : null}
          </form>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 36, paddingBottom: 22, borderBottom: "1px solid var(--line)" }}>
          <nav aria-label="Filter by product" className="chips">
            <Link className="chip press" href={q ? `/guides?q=${encodeURIComponent(q)}` : "/guides"} aria-current={!selected ? "true" : undefined}>
              All <span className="mono" style={{ fontSize: 11, opacity: 0.75 }}>{guides.filter((g) => productById.has(g.product_id)).length}</span>
            </Link>
            {hostedProducts.map((p) => (
              <Link key={p.id} className="chip press product-theme" style={productTheme(p)} href={`/guides?product=${p.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={selected?.id === p.id ? "true" : undefined}>
                <span className="dot" style={{ background: "var(--accent)" }} aria-hidden="true" />
                {p.name} <span className="mono" style={{ fontSize: 11, opacity: 0.75 }}>{guides.filter((g) => g.product_id === p.id).length}</span>
              </Link>
            ))}
          </nav>
        </div>

        {start.length ? (
          <section aria-labelledby="start-h" style={{ marginTop: 64 }}>
            <h2 id="start-h" style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 600 }}>
              Start here
            </h2>
            <div className="cards">
              {start.map((g) => {
                const p = productById.get(g.product_id)!;
                return (
                  <Link key={g.id} href={href(g)} className="card lift product-theme" style={productTheme(p)}>
                    <span className="eyebrow product-eyebrow" style={{ fontSize: 11 }}>
                      <span className="dot" aria-hidden="true" />
                      {p.name} · {categoryById.get(g.category_id ?? "")?.name ?? "Guide"}
                    </span>
                    <span className="t">{g.title}</span>
                    <span className="s">{g.standfirst}</span>
                    <span style={{ marginTop: "auto", fontSize: 14, color: "var(--accent-text)" }}>Read the guide →</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <AdSlot plan={plans[0]} />
        <AdSenseScript plans={plans} />

        <section aria-labelledby="all-h" style={{ marginTop: 64 }}>
          <h2 id="all-h" style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 600 }}>
            All guides
          </h2>
          <p aria-live="polite" style={{ margin: "0 0 24px", fontSize: 14, color: "var(--muted)" }}>
            {shown.length === 1 ? "1 guide" : `${shown.length} guides`}
            {q ? ` matching “${q}”` : ""}
          </p>
          {shown.length ? (
            <div className="list-groups">
              {groups.map((grp) => (
                <div key={grp.key} className="product-theme" style={productTheme(grp.p)}>
                  <h3 className="product-eyebrow">
                    <span className="dot" aria-hidden="true" />
                    {grp.product} · {grp.category}
                  </h3>
                  <ul>
                    {grp.items.map((g) => (
                      <li key={g.id}>
                        <Link href={href(g)}>
                          <span>{g.title}</span>
                          <span aria-hidden="true" style={{ color: "var(--muted)" }}>
                            →
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "48px 32px", borderRadius: 20, border: "1px dashed var(--line-2)", textAlign: "center" }}>
              <p className="serif" style={{ margin: 0, fontSize: 30 }}>
                Nothing matches that yet.
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 15, color: "var(--ink-2)" }}>
                Try another word, or <Link href="/guides">browse every guide</Link>.
              </p>
            </div>
          )}
        </section>

      </main>
      <SiteFooter showCookieChoices={plans.some((x) => x.source === "adsense")} />
    </div>
  );
}
