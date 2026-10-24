import { z } from "zod";
import { blocksSchema, type Block } from "./blocks";

export type Highlight = { label: string; value: string };

export type Product = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  headline: string;
  headline_em: string;
  headline_style: "serif" | "sans";
  description: string;
  highlights: Highlight[];
  cta_label: string;
  cta_url: string | null;
  site_url: string | null;
  guides_url: string | null;
  accent_dark: string;
  accent_light: string;
  button_dark: string;
  button_light: string;
  status: "draft" | "live" | "hidden";
  sort_order: number;
};

export type Category = { id: string; product_id: string; name: string; slug: string; sort_order: number };

export type GuideStatus = "draft" | "scheduled" | "published" | "archived";
export type AdSpot = "inline" | "end" | "side" | "hub";

export type Guide = {
  id: string;
  product_id: string;
  category_id: string | null;
  slug: string;
  title: string;
  standfirst: string;
  blocks: Block[];
  start_here: boolean;
  meta_title: string;
  meta_description: string;
  author_name: string;
  status: GuideStatus;
  publish_at: string | null;
  published_at: string | null;
  ads_enabled: boolean;
  ad_spots: AdSpot[];
  version: number;
  updated_at: string;
};

export type AdSettings = {
  enabled: boolean;
  house_enabled: boolean;
  network_enabled: boolean;
  spots: AdSpot[];
  max_per_page: number;
  excluded_category_ids: string[];
  adsense_client: string | null;
  adsense_units: Partial<Record<AdSpot, string>>;
};

export type Ad = {
  id: string;
  name: string;
  kind: "sponsor" | "house";
  sponsor_name: string;
  eyebrow: string;
  headline: string;
  body: string;
  cta_label: string;
  url: string;
  image_path: string | null;
  spots: AdSpot[];
  starts_at: string | null;
  ends_at: string | null;
  status: "draft" | "live" | "paused";
};

const highlightsSchema = z.array(z.object({ label: z.string(), value: z.string() })).max(3).catch([]);

export function normaliseProduct(row: Record<string, unknown>): Product {
  return { ...(row as unknown as Product), highlights: highlightsSchema.parse(row.highlights) };
}

/** Rows come from our own DB, but blocks are re-validated so a bad row can't break a page. */
export function normaliseGuide(row: Record<string, unknown>): Guide {
  const parsed = blocksSchema.safeParse(row.blocks);
  return { ...(row as unknown as Guide), blocks: parsed.success ? parsed.data : [] };
}
