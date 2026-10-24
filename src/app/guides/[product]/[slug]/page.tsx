import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { productTheme } from "@/components/site/productTheme";
import { BlockRenderer, buildToc } from "@/components/guides/BlockRenderer";
import { AdSenseScript, AdSlot } from "@/components/guides/Ads";
import { getAdSettings, getCategories, getGuide, getRunningAds } from "@/lib/content/queries";
import { planAds } from "@/lib/ads";
import { publicEnv } from "@/lib/env";
import type { Block } from "@/lib/content/blocks";

export const dynamic = "force-dynamic";

type Params = Promise<{ product: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { product, slug } = await params;
  const found = await getGuide(product, slug);
  if (!found) return { title: "Guide not found" };
  const { guide } = found;
  const url = `/guides/${product}/${slug}`;
  return {
    title: { absolute: guide.meta_title || `${guide.title} · ${found.product.name}` },
    description: guide.meta_description || guide.standfirst,
    alternates: { canonical: url },
    openGraph: { type: "article", title: guide.meta_title || guide.title, description: guide.meta_description || guide.standfirst, url },
  };
}

function wordCount(blocks: Block[]): number {
  let text = "";
  for (const b of blocks) {
    if ("text" in b) text += " " + b.text;
    if (b.type === "list") text += " " + b.items.join(" ");
    if (b.type === "faq") text += " " + b.items.map((i) => i.q + " " + i.a).join(" ");
    if (b.type === "table") text += " " + b.rows.flat().join(" ");
  }
  return text.split(/\s+/).filter(Boolean).length;
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");

export default async function GuidePage({ params }: { params: Params }) {
  const { product: productSlug, slug } = await params;
  const found = await getGuide(productSlug, slug);
  if (!found) notFound();
  const { guide, product } = found;
  const [settings, ads, categories] = await Promise.all([getAdSettings(), getRunningAds(), getCategories()]);
  const category = categories.find((c) => c.id === guide.category_id);
  const env = publicEnv();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const plans = planAds({ settings, ads, spots: guide.ad_spots, categoryId: guide.category_id, guideAdsEnabled: guide.ads_enabled, seed: guide.id });
  const bySpot = (s: string) => plans.find((p) => p.spot === s);
  const toc = buildToc(guide.blocks);
  const minutes = Math.max(1, Math.round(wordCount(guide.blocks) / 220));
  const url = `${env.siteUrl}/guides/${product.slug}/${guide.slug}`;

  const faq = guide.blocks.find((b): b is Extract<Block, { type: "faq" }> => b.type === "faq");
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.meta_description || guide.standfirst,
      datePublished: guide.published_at ?? guide.updated_at,
      dateModified: guide.updated_at,
      author: { "@type": "Organization", name: guide.author_name || "Midnight Poetry Studio" },
      publisher: { "@type": "Organization", name: "Midnight Poetry Studio" },
      mainEntityOfPage: url,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Midnight Poetry", item: env.siteUrl },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${env.siteUrl}/guides` },
        { "@type": "ListItem", position: 3, name: guide.title, item: url },
      ],
    },
    ...(faq
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
          },
        ]
      : []),
  ];
  // JSON.stringify + escaping "<" keeps this inert even if a title contains "</script>".
  const ldJson = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

  return (
    <div className="page product-theme" style={productTheme(product)}>
      <SiteHeader current="guides" />
      <main id="top" className="wrap" style={{ paddingTop: 28, paddingBottom: 96, maxWidth: 1200 }}>
        <nav aria-label="Breadcrumb" className="crumbs">
          <Link href="/">Midnight Poetry</Link> <span aria-hidden="true">›</span> <Link href="/guides">Guides</Link> <span aria-hidden="true">›</span>{" "}
          <Link href={`/guides?product=${product.slug}`}>{product.name}</Link> <span aria-hidden="true">›</span> <span aria-current="page">{guide.title}</span>
        </nav>

        <header className="article-head">
          <p className="eyebrow" style={{ marginBottom: 18, color: "var(--accent-text)" }}>
            {category?.name ?? product.name}
          </p>
          <h1>{guide.title}</h1>
          {guide.standfirst ? <p className="standfirst">{guide.standfirst}</p> : null}
          <div className="byline">
            {guide.author_name ? <span>By {guide.author_name}</span> : null}
            <span>Updated {fmt(guide.updated_at)}</span>
            <span>{minutes} min read</span>
          </div>
        </header>

        <div className="article-layout">
          <article className="prose">
            <BlockRenderer blocks={guide.blocks} supabaseUrl={env.supabaseUrl} inlineAd={<AdSlot plan={bySpot("inline")} />} />
            <AdSlot plan={bySpot("end")} />
            <p style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--line)", fontSize: 15, color: "var(--muted)" }}>
              {guide.author_name ? `Written by ${guide.author_name}. ` : ""}Last updated {fmt(guide.updated_at)}. Spotted something wrong? Tell us and we&apos;ll fix it.
            </p>
          </article>

          {toc.length ? (
            <aside className="toc" aria-label="On this page">
              <p className="eyebrow" style={{ marginBottom: 12, fontSize: 11 }}>
                On this page
              </p>
              <ul>
                {toc.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`}>{t.text}</a>
                  </li>
                ))}
              </ul>
              <div className="side-ad">
                <AdSlot plan={bySpot("side")} variant="side" />
              </div>
            </aside>
          ) : null}
        </div>
      </main>
      <SiteFooter showCookieChoices={plans.some((p) => p.source === "adsense")} />
      <AdSenseScript plans={plans} />
      {/* eslint-disable-next-line react/no-danger -- escaped JSON-LD */}
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: ldJson }} />
    </div>
  );
}
