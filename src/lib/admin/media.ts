import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX = 3 * 1024 * 1024;

/** Identify the image by its first bytes, not by the name or the browser's claim. */
export function sniffImage(b: Uint8Array): { ext: "webp" | "png" | "jpg"; type: string } | null {
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: "webp", type: "image/webp" };
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  return null;
}

export async function uploadImage(supabase: SupabaseClient, file: File, folder: "guides" | "ads"): Promise<{ path?: string; error?: string }> {
  if (!file || typeof file.arrayBuffer !== "function") return { error: "Choose an image." };
  if (file.size > MAX) return { error: "Images can be up to 3 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { error: "Use a PNG, JPG or WebP image (SVG isn't accepted)." };
  const path = `${folder}/${crypto.randomUUID()}.${kind.ext}`;
  const { error } = await supabase.storage.from("media").upload(path, bytes, { contentType: kind.type, upsert: false, cacheControl: "31536000" });
  if (error) return { error: "Upload failed. You may not have permission." };
  return { path };
}
