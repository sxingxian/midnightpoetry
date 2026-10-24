import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, Product } from "@/lib/content/types";

/** Products that keep their guides here (not on their own site), plus their categories. */
export async function editorData(supabase: SupabaseClient) {
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from("products").select("id, name, slug, guides_url").order("sort_order"),
    supabase.from("categories").select("*").order("sort_order"),
  ]);
  const hosted = ((products ?? []) as (Pick<Product, "id" | "name" | "slug"> & { guides_url: string | null })[]).filter((p) => !p.guides_url);
  return { products: hosted.map(({ id, name, slug }) => ({ id, name, slug })), categories: (categories ?? []) as Category[] };
}
