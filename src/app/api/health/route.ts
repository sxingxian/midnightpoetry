import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PRODUCT_COLUMNS =
  "id, slug, name, kind, headline, headline_em, headline_style, description, highlights, cta_label, cta_url, site_url, accent_dark, accent_light, button_dark, button_light, status, sort_order, created_at, updated_at";

/**
 * Set-up check: which public settings the Worker was built with, and whether the
 * public pages' own queries work. Only yes/no, row counts and error codes — no
 * values, keys or messages — so it is safe to leave public. See docs/DEPLOYMENT.md.
 */
export async function GET() {
  const settings = {
    siteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
    supabaseUrl: URL.canParse(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
    supabaseKey: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").length >= 20,
    turnstileSiteKey: !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  };
  const database: Record<string, string> = {};
  if (settings.supabaseUrl && settings.supabaseKey) {
    try {
      const db = createPublicClient();
      // The same reads the landing page and guides make.
      const checks = {
        products: db.from("products").select(PRODUCT_COLUMNS).eq("status", "live"),
        categories: db.from("categories").select("id, product_id, name, slug, sort_order"),
        guides: db.from("guides").select("id, product_id, category_id, slug, title, standfirst, start_here, status, publish_at, published_at, updated_at"),
        ad_settings: db.from("ad_settings").select("enabled, house_enabled, network_enabled, spots, max_per_page, excluded_category_ids, adsense_client, adsense_units").eq("id", 1),
        ads: db.from("ads").select("id, kind, sponsor_name, eyebrow, headline, body, cta_label, url, image_path, spots, starts_at, ends_at, status"),
      };
      for (const [name, q] of Object.entries(checks)) {
        const { data, error } = await q;
        database[name] = error ? `error ${error.code || "unknown"}` : `ok (${data?.length ?? 0} rows)`;
      }
      // Migrations: the security update hides editor ids from the public, so this read should be refused.
      const hidden = await db.from("guides").select("updated_by").limit(1);
      database.securityMigration = hidden.error ? "applied" : "missing";
      const linkOut = await db.from("products").select("guides_url").limit(1);
      database.guidesMigration = linkOut.error ? "applied" : "missing";
    } catch {
      database.connection = "error";
    }
  } else database.connection = "not configured";
  return NextResponse.json({ settings, database }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
