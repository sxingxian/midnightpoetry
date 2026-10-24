import type { CookieOptionsWithName } from "@supabase/ssr";
import { isProd } from "@/lib/env";

/**
 * Auth cookies are httpOnly: the browser never talks to Supabase Auth directly,
 * every auth call goes through a server action. In production the __Host- prefix
 * pins the cookie to this exact host over HTTPS. SameSite=Lax (not Strict) so the
 * session survives following a link back to the site.
 */
export function authCookieOptions(): CookieOptionsWithName {
  return {
    name: isProd ? "__Host-mp-auth" : "mp-auth",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
  };
}
