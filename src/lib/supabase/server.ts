import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import { authCookieOptions } from "./cookies";

/** Per-request client that carries the signed-in user's session (admin + auth). */
export async function createSessionClient(): Promise<SupabaseClient> {
  const env = publicEnv();
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there. The
          // middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/** Cookie-less anonymous client for public pages: only sees what RLS exposes to anon. */
export function createPublicClient(): SupabaseClient {
  const env = publicEnv();
  return createPlainClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
