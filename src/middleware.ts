import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { adsenseCsp, generateNonce, strictCsp } from "@/lib/csp";
import { authCookieOptions } from "@/lib/supabase/cookies";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/register", "/admin/forgot"];

// Ad settings rarely change; cache per isolate for a minute so guide pages don't
// make an extra round trip just to choose a security policy.
let adsCache: { at: number; on: boolean } | null = null;

async function adsenseActive(supabaseUrl: string, anonKey: string): Promise<boolean> {
  const now = Date.now();
  if (adsCache && now - adsCache.at < 60_000) return adsCache.on;
  let on = false;
  try {
    // apikey header only: Supabase's newer publishable keys (sb_publishable_…) aren't JWTs and are
    // refused as "Authorization: Bearer", which silently left guides on the strict policy that
    // blocks Google's ad frames ("This content is blocked").
    const res = await fetch(`${supabaseUrl}/rest/v1/ad_settings?id=eq.1&select=enabled,network_enabled,adsense_client`, {
      headers: { apikey: anonKey },
    });
    if (!res.ok) console.error("[middleware] ad settings check failed", res.status);
    if (res.ok) {
      const rows = (await res.json()) as { enabled: boolean; network_enabled: boolean; adsense_client: string | null }[];
      const s = rows[0];
      on = !!s && s.enabled && s.network_enabled && !!s.adsense_client;
    }
  } catch {
    on = false; // fail closed: strict policy, AdSense simply doesn't load
  }
  adsCache = { at: now, on };
  return on;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const dev = process.env.NODE_ENV !== "production";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const nonce = generateNonce();

  const useAdsense = pathname.startsWith("/guides") && supabaseUrl && anonKey ? await adsenseActive(supabaseUrl, anonKey) : false;
  const csp = useAdsense ? adsenseCsp({ nonce }) : strictCsp({ nonce, supabaseUrl: supabaseUrl || undefined, dev });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  // Pages only render Google's ads when this response allows them, so the two can never disagree.
  requestHeaders.set("x-adsense", useAdsense ? "on" : "off");

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const needsSession = isAdmin || pathname.startsWith("/auth/");

  if (needsSession && supabaseUrl && anonKey) {
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookieOptions: authCookieOptions(),
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          // Forward the refreshed session to the page render, not the stale one.
          requestHeaders.set("cookie", request.headers.get("cookie") ?? "");
          response = NextResponse.next({ request: { headers: requestHeaders } });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    // getUser() validates the token with Supabase Auth (getSession() would trust the cookie).
    const { data } = await supabase.auth.getUser();
    const isPublicAdminPage = PUBLIC_ADMIN_PATHS.some((p) => pathname === p);
    if (isAdmin && !isPublicAdminPage && !data.user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      if (pathname !== "/admin") url.searchParams.set("next", pathname);
      const redirect = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      response = redirect;
    }
  }

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  // Ad clicks and Google's consent message open new windows; allow that only where Google's ads run.
  response.headers.set("Cross-Origin-Opener-Policy", useAdsense ? "same-origin-allow-popups" : "same-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
  if (!dev) response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  if (needsSession) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and files with an extension.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|webp|svg|woff2|txt|xml)$).*)",
  ],
};
