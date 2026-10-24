"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActionRole } from "@/lib/auth";
import { blocksSchema } from "@/lib/content/blocks";
import { failure, str, type ActionResult } from "@/lib/admin/result";
import { uploadImage } from "@/lib/admin/media";

const guideSchema = z.object({
  product_id: z.uuid("Choose a product."),
  category_id: z.union([z.uuid(), z.literal("").transform(() => null)]),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Address: lowercase letters, numbers and dashes.").max(80),
  title: z.string().trim().min(1, "Add a title.").max(140),
  standfirst: z.string().trim().max(400),
  start_here: z.boolean(),
  meta_title: z.string().trim().max(70, "Search title: 70 characters at most."),
  meta_description: z.string().trim().max(170, "Search description: 170 characters at most."),
  author_name: z.string().trim().max(80),
  ads_enabled: z.boolean(),
  ad_spots: z.array(z.enum(["inline", "end", "side"])).max(3),
});

const intents = ["draft", "publish", "schedule", "unpublish", "archive"] as const;

export async function saveGuide(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = str(form.get("id"));
  const intent = z.enum(intents).safeParse(str(form.get("intent")));
  if (!intent.success) return { error: "Unknown action." };

  let blocks: unknown;
  try {
    blocks = JSON.parse(str(form.get("blocks")) || "[]");
  } catch {
    return { error: "The guide content couldn't be read. Reload and try again." };
  }
  const parsedBlocks = blocksSchema.safeParse(blocks);
  if (!parsedBlocks.success) {
    const issue = parsedBlocks.error.issues[0];
    const n = typeof issue?.path[0] === "number" ? issue.path[0] + 1 : null;
    return { error: `${n ? `Block ${n}: ` : ""}${issue?.message ?? "Check the content."}` };
  }
  const parsed = guideSchema.safeParse({
    product_id: str(form.get("product_id")),
    category_id: str(form.get("category_id")),
    slug: str(form.get("slug")),
    title: str(form.get("title")),
    standfirst: str(form.get("standfirst")),
    start_here: form.get("start_here") === "on",
    meta_title: str(form.get("meta_title")),
    meta_description: str(form.get("meta_description")),
    author_name: str(form.get("author_name")),
    ads_enabled: form.get("ads_enabled") === "on",
    ad_spots: form.getAll("ad_spots").map(String),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const row: Record<string, unknown> = { ...parsed.data, blocks: parsedBlocks.data };
  switch (intent.data) {
    case "publish":
      if (!parsedBlocks.data.length) return { error: "Add some content before publishing." };
      row.status = "published";
      row.publish_at = null;
      break;
    case "schedule": {
      const at = z.iso.datetime({ offset: true }).safeParse(str(form.get("publish_at")));
      if (!at.success || new Date(at.data) <= new Date()) return { error: "Pick a time in the future to schedule." };
      row.status = "scheduled";
      row.publish_at = at.data;
      break;
    }
    case "unpublish":
    case "draft":
      if (intent.data === "unpublish" || !id) row.status = "draft";
      break;
    case "archive":
      row.status = "archived";
      break;
  }

  let newId = id;
  try {
    const { supabase, user } = await requireActionRole("editor");
    row.updated_by = user.id;
    if (id) {
      if (!z.uuid().safeParse(id).success) return { error: "Unknown guide." };
      const { error } = await supabase.from("guides").update(row).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("guides").insert({ status: "draft", ...row }).select("id").single();
      if (error) throw error;
      newId = data.id;
    }
  } catch (e) {
    return failure(e);
  }
  if (!id) redirect(`/admin/guides/${newId}?saved=1`);
  const msg = { draft: "Saved.", publish: "Published — it's live now.", schedule: "Scheduled.", unpublish: "Moved back to draft.", archive: "Archived — no longer on the site." }[intent.data];
  return { ok: msg, n: Date.now() };
}

export async function uploadGuideImage(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireActionRole("editor");
    const res = await uploadImage(supabase, form.get("file") as File, "guides");
    return res.error ? { error: res.error } : { ok: "Uploaded.", path: res.path, n: Date.now() };
  } catch (e) {
    return failure(e, "Upload failed.");
  }
}
