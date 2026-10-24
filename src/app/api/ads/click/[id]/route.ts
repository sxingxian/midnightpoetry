import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Counts a click on a sponsor/house ad and redirects to its link.
 * The destination comes from the database for a running ad only — never from the
 * request — so this can't be used as an open redirect.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new NextResponse("Not found", { status: 404 });
  const { data, error } = await createPublicClient().rpc("record_ad_click", { p_ad: id });
  const dest = typeof data === "string" ? data : null;
  if (error || !dest || !dest.startsWith("https://")) return new NextResponse("This ad has ended.", { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.redirect(dest, { status: 302, headers: { "Cache-Control": "no-store", "Referrer-Policy": "origin" } });
}
