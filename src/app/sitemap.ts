import type { MetadataRoute } from "next";
import { getLiveProducts, getPublishedGuides } from "@/lib/content/queries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://midnightpoetry.studio").replace(/\/$/, "");
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/guides`, changeFrequency: "weekly", priority: 0.8 },
  ];
  try {
    const [products, guides] = await Promise.all([getLiveProducts(), getPublishedGuides()]);
    const bySlug = new Map(products.map((p) => [p.id, p.slug]));
    for (const g of guides) {
      const p = bySlug.get(g.product_id);
      if (p) entries.push({ url: `${base}/guides/${p}/${g.slug}`, lastModified: g.updated_at, changeFrequency: "monthly", priority: 0.7 });
    }
  } catch {
    /* database unreachable: static entries only */
  }
  return entries;
}
