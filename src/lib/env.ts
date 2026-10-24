import { z } from "zod";

/**
 * Environment access. NEXT_PUBLIC_* values must be read with literal property
 * names so Next.js can inline them at build time. Validation is lazy so a build
 * without secrets still succeeds; the first request that needs a value fails
 * loudly instead of running with a half-configured app.
 */

const publicSchema = z.object({
  siteUrl: z.url(),
  supabaseUrl: z.url(),
  supabaseAnonKey: z.string().min(20),
  turnstileSiteKey: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicSchema>;

let cachedPublic: PublicEnv | null = null;

export function publicEnv(): PublicEnv {
  if (cachedPublic) return cachedPublic;
  const parsed = publicSchema.safeParse({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  });
  if (!parsed.success) {
    throw new Error("Missing or invalid public environment variables: " + parsed.error.issues.map((i) => i.path.join(".")).join(", "));
  }
  cachedPublic = { ...parsed.data, siteUrl: parsed.data.siteUrl.replace(/\/$/, "") };
  return cachedPublic;
}

const supabaseSchema = z.object({ supabaseUrl: z.url(), supabaseAnonKey: z.string().min(20) });

/**
 * Just the Supabase address and public key. Public pages only need these, so a missing
 * Turnstile key (only used by the admin sign-in forms) never takes the guides down.
 */
export function supabaseEnv(): z.infer<typeof supabaseSchema> {
  const parsed = supabaseSchema.safeParse({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error("Missing or invalid Supabase settings: " + parsed.error.issues.map((i) => i.path.join(".")).join(", "));
  }
  return parsed.data;
}

/** Same as publicEnv() but returns null instead of throwing (for pages that can degrade). */
export function maybePublicEnv(): PublicEnv | null {
  try {
    return publicEnv();
  } catch {
    return null;
  }
}

const serverSchema = z.object({
  resendApiKey: z.string().min(10),
  emailFrom: z.string().min(3),
  ownerNotifyEmail: z.email(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function serverEnv(): ServerEnv | null {
  const parsed = serverSchema.safeParse({
    resendApiKey: process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM,
    ownerNotifyEmail: process.env.OWNER_NOTIFY_EMAIL,
  });
  return parsed.success ? parsed.data : null;
}

export const isProd = process.env.NODE_ENV === "production";
