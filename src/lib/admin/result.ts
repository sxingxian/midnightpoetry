import { NotAllowed } from "@/lib/auth";

export type ActionResult = { ok?: string; error?: string; id?: string; path?: string; n?: number };

/** Turn any failure into a short message; details go to the server log only. */
export function failure(e: unknown, fallback = "Something went wrong. Nothing was saved."): ActionResult {
  if (e instanceof NotAllowed) return { error: e.message };
  if (e && typeof e === "object" && "code" in e) {
    const code = String((e as { code: unknown }).code);
    if (code === "23505") return { error: "That address (slug) is already used. Pick another." };
    if (code === "23514") return { error: "One of the values isn't allowed. Check links start with https:// and colours look like #A1B2C3." };
    if (code === "42501") return { error: "You don't have permission to do that." };
  }
  console.error("[admin action]", e instanceof Error ? e.message : e);
  return { error: fallback };
}

export const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
export const optUrl = (v: string) => (v.trim() === "" ? null : v.trim());
