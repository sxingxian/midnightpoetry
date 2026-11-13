"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActionRole } from "@/lib/auth";
import { describeIssue, failure, str, type ActionResult } from "@/lib/admin/result";
import { contactEmailSchema, isSitePageSlug, parsePageBody, sitePageSchema } from "@/lib/content/site-pages";

const settingsSchema = z.object({
  contact_email: contactEmailSchema,
  adsense_client: z.union([z.literal("").transform(() => null), z.string().trim().regex(/^ca-pub-\d{16}$/, "The publisher ID looks like ca-pub- followed by 16 digits.")]),
  ads_enabled: z.boolean(),
});

/** Owner only: the public contact email, the AdSense publisher ID and the master switch for ads on guides. */
export async function saveSiteSettings(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse({
    contact_email: str(form.get("contact_email")).trim(),
    adsense_client: str(form.get("adsense_client")).trim(),
    ads_enabled: form.get("ads_enabled") === "on",
  });
  if (!parsed.success) return { error: describeIssue(parsed.error.issues[0]) };
  const { contact_email, adsense_client, ads_enabled } = parsed.data;
  try {
    const { supabase } = await requireActionRole("owner");
    const { data: current, error: readError } = await supabase.from("ad_settings").select("network_enabled").eq("id", 1).maybeSingle();
    if (readError) throw readError;
    if (current?.network_enabled && !adsense_client) return { error: "Google AdSense is switched on under Ads on guides. Switch it off there before removing the publisher ID." };
    // Each update returns its row, so a save the database refused (not an owner, no second step) is reported, not silently lost.
    const a = await supabase.from("site_settings").update({ contact_email }).eq("id", 1).select("id");
    if (a.error) throw a.error;
    const b = await supabase.from("ad_settings").update({ adsense_client, enabled: ads_enabled }).eq("id", 1).select("id");
    if (b.error) throw b.error;
    if (!a.data?.length || !b.data?.length) return { error: "You don't have permission to do that." };
    revalidatePath("/", "layout"); // contact email, ads.txt and the guides all read these
    return { ok: "Saved — logged in the audit log.", n: Date.now() };
  } catch (e) {
    return failure(e);
  }
}

/** Owner only: the title and text of one standing page. The text must turn into valid blocks before it is stored. */
export async function saveSitePage(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const slug = str(form.get("slug"));
  if (!isSitePageSlug(slug)) return { error: "Unknown page." };
  const parsed = sitePageSchema.safeParse({ title: str(form.get("title")), body: str(form.get("body")) });
  if (!parsed.success) return { error: describeIssue(parsed.error.issues[0]) };
  const checked = parsePageBody(parsed.data.body);
  if (checked.error) return { error: checked.error };
  try {
    const { supabase } = await requireActionRole("owner");
    const { data, error } = await supabase.from("site_pages").update(parsed.data).eq("slug", slug).select("slug");
    if (error) throw error;
    if (!data?.length) return { error: "You don't have permission to do that, or the page is missing — run the database migration." };
    revalidatePath(`/${slug}`);
    revalidatePath("/admin", "layout");
    return { ok: "Saved. The page is live, and the previous version is kept.", n: Date.now() };
  } catch (e) {
    return failure(e);
  }
}
