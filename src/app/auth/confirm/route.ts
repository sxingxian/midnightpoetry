import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSessionClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

const TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "email_change", "magiclink"];

/**
 * Landing point for links in auth emails (see the email templates in the README):
 *   /auth/confirm?token_hash=…&type=email|recovery&next=/admin…
 * Works even if the link is opened in a different browser from the one that asked for it.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"), type === "recovery" ? "/admin/reset" : "/admin");
  const fail = new URL("/admin/login?link=expired", url.origin);

  if (!tokenHash || !type || !TYPES.includes(type) || tokenHash.length > 512) return NextResponse.redirect(fail);
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return NextResponse.redirect(fail);
  return NextResponse.redirect(new URL(next, url.origin));
}
