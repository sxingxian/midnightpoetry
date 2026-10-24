import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import { normaliseGuide, normaliseProduct, type Ad, type AdSettings, type Category, type Guide, type Product } from "./types";

// The public (anon) role can only read these columns; "*" would be refused.
const PRODUCT_COLUMNS =
  "id, slug, name, kind, headline, headline_em, headline_style, description, highlights, cta_label, cta_url, site_url, guides_url, accent_dark, accent_light, button_dark, button_light, status, sort_order, created_at, updated_at";
const GUIDE_COLUMNS =
  "id, product_id, category_id, slug, title, standfirst, blocks, start_here, meta_title, meta_description, author_name, status, publish_at, published_at, ads_enabled, ad_spots, version, created_at, updated_at";
const GUIDE_LIST_COLUMNS = "id, product_id, category_id, slug, title, standfirst, start_here, status, publish_at, published_at, updated_at";

export const getLiveProducts = cache(async (): Promise<Product[]> => {
  const { data, error } = await createPublicClient().from("products").select(PRODUCT_COLUMNS).eq("status", "live").order("sort_order");
  if (error) throw new Error("Could not load products");
  return (data ?? []).map(normaliseProduct);
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const { data, error } = await createPublicClient().from("categories").select("id, product_id, name, slug, sort_order").order("sort_order");
  if (error) throw new Error("Could not load categories");
  return (data ?? []) as Category[];
});

export type GuideListItem = Pick<Guide, "id" | "product_id" | "category_id" | "slug" | "title" | "standfirst" | "start_here" | "published_at" | "updated_at">;

export const getPublishedGuides = cache(async (): Promise<GuideListItem[]> => {
  // RLS already limits anon to published / due guides.
  const { data, error } = await createPublicClient().from("guides").select(GUIDE_LIST_COLUMNS).order("published_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error("Could not load guides");
  return (data ?? []) as GuideListItem[];
});

export const getGuide = cache(async (productSlug: string, slug: string): Promise<{ guide: Guide; product: Product } | null> => {
  const db = createPublicClient();
  const { data: product } = await db.from("products").select(PRODUCT_COLUMNS).eq("slug", productSlug).eq("status", "live").maybeSingle();
  if (!product) return null;
  const { data: guide } = await db.from("guides").select(GUIDE_COLUMNS).eq("product_id", product.id).eq("slug", slug).maybeSingle();
  if (!guide) return null;
  return { guide: normaliseGuide(guide), product: normaliseProduct(product) };
});

export const getAdSettings = cache(async (): Promise<AdSettings | null> => {
  const { data } = await createPublicClient().from("ad_settings").select("enabled, house_enabled, network_enabled, spots, max_per_page, excluded_category_ids, adsense_client, adsense_units").eq("id", 1).maybeSingle();
  return (data as AdSettings | null) ?? null;
});

export const getRunningAds = cache(async (): Promise<Ad[]> => {
  const { data } = await createPublicClient().from("ads").select("id, kind, sponsor_name, eyebrow, headline, body, cta_label, url, image_path, spots, starts_at, ends_at, status");
  // The internal ad name stays private to the admin.
  return ((data ?? []) as Omit<Ad, "name">[]).map((a) => ({ ...a, name: "" }));
});
