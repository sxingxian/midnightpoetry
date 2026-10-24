import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Counts a click on a sponsor/house ad and redirects to its link.
 * - The destination comes from the database for a running ad only — never from the
 *   request — so this can't be used as an open redirect.
 * - Clicks are only counted when the database sees the Worker's AD_CLICK_SECRET, and
 *   once per visitor per ad per day. The visitor is a salted one-way hash (no IP is stored).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new NextResponse("Not found", { status: 404 });

  const secret = process.env.AD_CLICK_SECRET ?? "";
  const ip = req.headers.get("cf-connecting-ip") ?? "";
  const ua = req.headers.get("user-agent") ?? "";
  const day = new Date().toISOString().slice(0, 10);
  const visitor = await sha256Hex(`${secret}|${day}|${ip}|${ua}`);

  const { data, error } = await createPublicClient().rpc("record_ad_click", { p_ad: id, p_visitor: visitor, p_key: secret });
  const dest = typeof data === "string" ? data : null;
  if (error || !dest || !dest.startsWith("https://")) return new NextResponse("This ad has ended.", { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.redirect(dest, { status: 302, headers: { "Cache-Control": "no-store", "Referrer-Policy": "origin", "X-Robots-Tag": "noindex" } });
}
