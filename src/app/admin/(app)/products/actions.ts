"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActionRole } from "@/lib/auth";
import { httpsUrl } from "@/lib/content/blocks";
import { failure, optUrl, str, type ActionResult } from "@/lib/admin/result";

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes.").max(60);
const hexColour = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Colours look like #A1B2C3.");
const maybeUrl = z.union([z.null(), httpsUrl]);

const productSchema = z.object({
  slug,
  name: z.string().trim().min(1).max(60),
  kind: z.string().trim().max(80),
  headline: z.string().trim().max(120),
  headline_em: z.string().trim().max(120),
  headline_style: z.enum(["serif", "sans"]),
  description: z.string().trim().max(400),
  highlights: z.array(z.object({ label: z.string().trim().min(1).max(30), value: z.string().trim().min(1).max(30) })).max(3),
  cta_label: z.string().trim().min(1).max(40),
  cta_url: maybeUrl,
  site_url: maybeUrl,
  accent_dark: hexColour,
  accent_light: hexColour,
  button_dark: hexColour,
  button_light: hexColour,
  status: z.enum(["draft", "live", "hidden"]),
  sort_order: z.coerce.number().int().min(0).max(999),
});

export async function saveProduct(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = str(form.get("id"));
  const highlights = [0, 1, 2]
    .map((i) => ({ label: str(form.get(`hl${i}_label`)), value: str(form.get(`hl${i}_value`)) }))
    .filter((h) => h.label.trim() || h.value.trim());
  const parsed = productSchema.safeParse({
    slug: str(form.get("slug")),
    name: str(form.get("name")),
    kind: str(form.get("kind")),
    headline: str(form.get("headline")),
    headline_em: str(form.get("headline_em")),
    headline_style: str(form.get("headline_style")),
    description: str(form.get("description")),
    highlights,
    cta_label: str(form.get("cta_label")) || "Open",
    cta_url: optUrl(str(form.get("cta_url"))),
    site_url: optUrl(str(form.get("site_url"))),
    accent_dark: str(form.get("accent_dark")),
    accent_light: str(form.get("accent_light")),
    button_dark: str(form.get("button_dark")),
    button_light: str(form.get("button_light")),
    status: str(form.get("status")),
    sort_order: str(form.get("sort_order")) || "0",
  });
  if (!parsed.success) return { error: `${parsed.error.issues[0]?.path.join(" ")}: ${parsed.error.issues[0]?.message}` };
  let newId = id;
  try {
    const { supabase, user } = await requireActionRole("editor");
    const row = { ...parsed.data, updated_by: user.id };
    if (id) {
      if (!z.uuid().safeParse(id).success) return { error: "Unknown product." };
      const { error } = await supabase.from("products").update(row).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("products").insert(row).select("id").single();
      if (error) throw error;
      newId = data.id;
    }
  } catch (e) {
    return failure(e);
  }
  if (!id) redirect(`/admin/products/${newId}?saved=1`);
  return { ok: "Saved." };
}

const categorySchema = z.object({ product_id: z.uuid(), name: z.string().trim().min(1).max(60), slug, sort_order: z.coerce.number().int().min(0).max(999) });

export async function saveCategory(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = str(form.get("id"));
  const name = str(form.get("name"));
  const parsed = categorySchema.safeParse({
    product_id: str(form.get("product_id")),
    name,
    slug: str(form.get("slug")) || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    sort_order: str(form.get("sort_order")) || "0",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    const { supabase } = await requireActionRole("editor");
    const q = id ? supabase.from("categories").update(parsed.data).eq("id", id) : supabase.from("categories").insert(parsed.data);
    const { error } = await q;
    if (error) throw error;
    return { ok: "Category saved.", n: Date.now() };
  } catch (e) {
    return failure(e);
  }
}

export async function deleteCategory(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = z.uuid().safeParse(str(form.get("id")));
  if (!id.success) return { error: "Unknown category." };
  try {
    const { supabase } = await requireActionRole("editor");
    const { error } = await supabase.from("categories").delete().eq("id", id.data);
    if (error) throw error;
    return { ok: "Category removed. Its guides are now uncategorised.", n: Date.now() };
  } catch (e) {
    return failure(e);
  }
}
