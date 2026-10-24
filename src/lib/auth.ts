import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSessionClient } from "@/lib/supabase/server";

export type Role = "pending" | "viewer" | "editor" | "owner";
const RANK: Record<Role, number> = { pending: 0, viewer: 1, editor: 2, owner: 3 };

export type Profile = { id: string; email: string; display_name: string; role: Role };

export type AdminContext = {
  supabase: SupabaseClient;
  user: User;
  profile: Profile;
  aal2: boolean;
  hasTotp: boolean;
};

export function atLeast(role: Role, min: Role) {
  return RANK[role] >= RANK[min];
}

/** Session, profile and second-factor status for the signed-in user (or null). */
export async function getSession(): Promise<(Omit<AdminContext, "profile"> & { profile: Profile | null }) | null> {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser(); // verified with Supabase Auth, not just the cookie
  if (!data.user) return null;
  const [{ data: profile }, { data: aal }, { data: factors }] = await Promise.all([
    supabase.from("profiles").select("id, email, display_name, role").eq("id", data.user.id).maybeSingle(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  return {
    supabase,
    user: data.user,
    profile: (profile as Profile | null) ?? null,
    aal2: aal?.currentLevel === "aal2",
    hasTotp: (factors?.totp ?? []).some((f) => f.status === "verified"),
  };
}

/**
 * Gate for admin pages. Sends people to the right step: sign in → set up
 * two-step sign-in → enter the code → wait for approval → the page.
 */
export async function requireAdmin(min: Role = "viewer", next = "/admin"): Promise<AdminContext> {
  const s = await getSession();
  if (!s) redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  if (!s.hasTotp) redirect("/admin/security");
  if (!s.aal2) redirect(`/admin/mfa?next=${encodeURIComponent(next)}`);
  if (!s.profile || s.profile.role === "pending") redirect("/admin/pending");
  if (!atLeast(s.profile.role, min)) redirect("/admin?denied=1");
  return s as AdminContext;
}

export class NotAllowed extends Error {}

/** Gate for server actions: never redirects, throws so the action returns an error. */
export async function requireActionRole(min: Role): Promise<AdminContext> {
  const s = await getSession();
  if (!s || !s.aal2 || !s.profile || !atLeast(s.profile.role, min)) throw new NotAllowed("You don't have permission to do that.");
  return s as AdminContext;
}

/** Only allow same-site admin paths as post-login destinations (no open redirects). */
export function safeNext(next: unknown, fallback = "/admin"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/admin") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next.slice(0, 200);
}
