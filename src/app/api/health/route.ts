import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Set-up check: which public settings the Worker was built with, and whether the
 * public pages can read the database. Only yes/no and error codes — no values,
 * keys or messages — so it is safe to leave public. See docs/DEPLOYMENT.md.
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
      const checks = [
        ["products", db.from("products").select("id", { count: "exact", head: true })],
        ["guides", db.from("guides").select("id", { count: "exact", head: true })],
        ["categories", db.from("categories").select("id", { count: "exact", head: true })],
        ["ad_settings", db.from("ad_settings").select("id", { count: "exact", head: true })],
      ] as const;
      for (const [name, q] of checks) {
        const { error, count } = await q;
        database[name] = error ? `error ${error.code || "unknown"}` : `ok (${count ?? 0} visible)`;
      }
    } catch {
      database.connection = "error";
    }
  } else database.connection = "not configured";
  return NextResponse.json({ settings, database }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
