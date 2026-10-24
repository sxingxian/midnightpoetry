import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import { normaliseGuide, normaliseProduct, type Ad, type AdSettings, type Category, type Guide, type Product } from "./types";

const GUIDE_LIST_COLUMNS = "id, product_id, category_id, slug, title, standfirst, start_here, status, publish_at, published_at, updated_at";

export const getLiveProducts = cache(async (): Promise<Product[]> => {
  const { data, error } = await createPublicClient().from("products").select("*").eq("status", "live").order("sort_order");
  if (error) throw new Error("Could not load products");
  return (data ?? []).map(normaliseProduct);
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const { data, error } = await createPublicClient().from("categories").select("*").order("sort_order");
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
  const { data: product } = await db.from("products").select("*").eq("slug", productSlug).eq("status", "live").maybeSingle();
  if (!product) return null;
  const { data: guide } = await db.from("guides").select("*").eq("product_id", product.id).eq("slug", slug).maybeSingle();
  if (!guide) return null;
  return { guide: normaliseGuide(guide), product: normaliseProduct(product) };
});

export const getAdSettings = cache(async (): Promise<AdSettings | null> => {
  const { data } = await createPublicClient().from("ad_settings").select("enabled, house_enabled, network_enabled, spots, max_per_page, excluded_category_ids, adsense_client, adsense_units").eq("id", 1).maybeSingle();
  return (data as AdSettings | null) ?? null;
});

export const getRunningAds = cache(async (): Promise<Ad[]> => {
  const { data } = await createPublicClient().from("ads").select("id, name, kind, sponsor_name, eyebrow, headline, body, cta_label, url, image_path, spots, starts_at, ends_at, status");
  return (data ?? []) as Ad[];
});
