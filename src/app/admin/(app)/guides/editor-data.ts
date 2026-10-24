import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, Product } from "@/lib/content/types";

/** Every product's guides are written here; returns the products and their categories. */
export async function editorData(supabase: SupabaseClient) {
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from("products").select("id, name, slug").order("sort_order"),
    supabase.from("categories").select("*").order("sort_order"),
  ]);
  return { products: (products ?? []) as Pick<Product, "id" | "name" | "slug">[], categories: (categories ?? []) as Category[] };
}
