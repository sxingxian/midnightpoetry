"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActionRole } from "@/lib/auth";
import { httpsUrl } from "@/lib/content/blocks";
import { describeIssue, failure, str, type ActionResult } from "@/lib/admin/result";
import { uploadImage } from "@/lib/admin/media";

const SPOTS = ["inline", "end", "side", "hub"] as const;

const settingsSchema = z.object({
  enabled: z.boolean(),
  house_enabled: z.boolean(),
  network_enabled: z.boolean(),
  spots: z.array(z.enum(SPOTS)).max(4),
  max_per_page: z.coerce.number().int().min(1).max(3),
  excluded_category_ids: z.array(z.uuid()).max(100),
  adsense_client: z.union([z.literal("").transform(() => null), z.string().trim().regex(/^ca-pub-\d{16}$/, "The publisher ID looks like ca-pub- followed by 16 digits.")]),
  // partialRecord: only the spots that have a unit ID (zod 4's record() would demand all four).
  adsense_units: z.partialRecord(z.enum(SPOTS), z.string().regex(/^\d{6,20}$/, "Ad unit IDs are numbers.")),
});

export async function saveAdSettings(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const units: Record<string, string> = {};
  for (const s of SPOTS) {
    const v = str(form.get(`unit_${s}`)).trim();
    if (v) units[s] = v;
  }
  const parsed = settingsSchema.safeParse({
    enabled: form.get("enabled") === "on",
    house_enabled: form.get("house_enabled") === "on",
    network_enabled: form.get("network_enabled") === "on",
    spots: form.getAll("spots").map(String),
    max_per_page: str(form.get("max_per_page")) || "2",
    excluded_category_ids: form.getAll("excluded").map(String),
    adsense_client: str(form.get("adsense_client")),
    adsense_units: units,
  });
  if (!parsed.success) return { error: describeIssue(parsed.error.issues[0]) };
  if (parsed.data.network_enabled && !parsed.data.adsense_client) return { error: "Add your AdSense publisher ID before switching AdSense on." };
  try {
    const { supabase, user } = await requireActionRole("owner");
    const { error } = await supabase.from("ad_settings").update({ ...parsed.data, updated_by: user.id }).eq("id", 1);
    if (error) throw error;
    revalidatePath("/admin", "layout"); // refresh the admin pages with what was just saved
    return { ok: "Saved — logged in the audit log.", n: Date.now() };
  } catch (e) {
    return failure(e);
  }
}

const adSchema = z
  .object({
    name: z.string().trim().min(1, "Give the ad a name.").max(80),
    kind: z.enum(["sponsor", "house"]),
    sponsor_name: z.string().trim().max(60),
    eyebrow: z.string().trim().max(40),
    headline: z.string().trim().min(1, "Add a headline.").max(70, "Headlines can be up to 70 characters."),
    body: z.string().trim().max(140),
    cta_label: z.string().trim().min(1).max(24),
    url: httpsUrl,
    image_path: z.union([z.literal("").transform(() => null), z.string().regex(/^ads\/[a-z0-9-]+\.(webp|png|jpg)$/)]),
    spots: z.array(z.enum(SPOTS)).min(1, "Pick at least one spot.").max(4),
    starts_at: z.union([z.literal("").transform(() => null), z.iso.datetime({ offset: true })]),
    ends_at: z.union([z.literal("").transform(() => null), z.iso.datetime({ offset: true })]),
    status: z.enum(["draft", "live", "paused"]),
  })
  .refine((a) => a.kind !== "sponsor" || a.sponsor_name.length > 0, { message: "Sponsor ads need the sponsor's name." })
  .refine((a) => !a.starts_at || !a.ends_at || new Date(a.ends_at) > new Date(a.starts_at), { message: "The end date must be after the start." });

export async function saveAd(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = str(form.get("id"));
  const parsed = adSchema.safeParse({
    name: str(form.get("name")),
    kind: str(form.get("kind")),
    sponsor_name: str(form.get("sponsor_name")),
    eyebrow: str(form.get("eyebrow")),
    headline: str(form.get("headline")),
    body: str(form.get("body")),
    cta_label: str(form.get("cta_label")) || "Learn more",
    url: str(form.get("url")),
    image_path: str(form.get("image_path")),
    spots: form.getAll("spots").map(String),
    starts_at: str(form.get("starts_at")),
    ends_at: str(form.get("ends_at")),
    status: str(form.get("status")),
  });
  if (!parsed.success) return { error: describeIssue(parsed.error.issues[0]) };
  let newId = id;
  try {
    const { supabase, user } = await requireActionRole("editor");
    const row = { ...parsed.data, updated_by: user.id };
    if (id) {
      if (!z.uuid().safeParse(id).success) return { error: "Unknown ad." };
      const { error } = await supabase.from("ads").update(row).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("ads").insert(row).select("id").single();
      if (error) throw error;
      newId = data.id;
    }
  } catch (e) {
    return failure(e);
  }
  if (!id) redirect(`/admin/ads/${newId}?saved=1`);
  revalidatePath("/admin", "layout"); // refresh the admin pages with what was just saved
  return { ok: "Saved.", n: Date.now() };
}

export async function uploadAdImage(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireActionRole("editor");
    const res = await uploadImage(supabase, form.get("file") as File, "ads");
    return res.error ? { error: res.error } : { ok: "Uploaded.", path: res.path, n: Date.now() };
  } catch (e) {
    return failure(e, "Upload failed.");
  }
}
