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

const FIELD_NAMES: Record<string, string> = {
  cta_label: "Button text",
  cta_url: "Button link",
  site_url: "Product website",
  headline_em: "Second headline line",
  accent_dark: "Accent colour (dark)",
  accent_light: "Accent colour (light)",
  button_dark: "Button colour (dark)",
  button_light: "Button colour (light)",
  sort_order: "Order",
  meta_title: "Search title",
  meta_description: "Search description",
  author_name: "Author",
  publish_at: "Publish date",
  sponsor_name: "Sponsor name",
  starts_at: "Start date",
  ends_at: "End date",
  url: "Link",
  max_per_page: "Most ads on one page",
  adsense_client: "AdSense publisher ID",
  adsense_units: "Ad unit IDs",
};

type Issue = { code?: string; path: PropertyKey[]; message: string; minimum?: number | bigint; maximum?: number | bigint; origin?: string };

/** A validation problem in plain words, e.g. "Name is empty." instead of zod's "Too small: expected string…". */
export function describeIssue(issue: Issue | undefined, fallback = "Check the form."): string {
  if (!issue) return fallback;
  const key = [...issue.path].reverse().find((p) => typeof p === "string") as string | undefined;
  const field = key ? (FIELD_NAMES[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")) : "This field";
  if (key === "captcha") return "Complete the security check, then try again.";
  // Our own messages (written for people) pass through unchanged.
  if (!/^(Too small|Too big|Invalid|Expected)/i.test(issue.message)) return issue.message;
  if (issue.code === "too_small" && issue.origin === "string") return Number(issue.minimum) <= 1 ? `${field} is empty.` : `${field} needs at least ${issue.minimum} characters.`;
  if (issue.code === "too_big" && issue.origin === "string") return `${field} is too long (up to ${issue.maximum} characters).`;
  if (issue.code === "too_big" && issue.origin === "array") return `${field} has too many entries (up to ${issue.maximum}).`;
  if (issue.code === "too_small" && issue.origin === "array") return `${field} needs at least ${issue.minimum}.`;
  return `${field} isn't valid.`;
}
