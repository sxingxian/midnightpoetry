import { z } from "zod";

/**
 * Guides are stored as a list of typed blocks. Every block is validated on save
 * and rendered by React — there is no path for raw HTML into a page.
 */

const str = (min: number, max: number) => z.string().trim().min(min).max(max);

export const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" && !!u.hostname && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Must be a full https:// link");

export const headingBlock = z.object({ type: z.literal("heading"), text: str(1, 120) });
export const paragraphBlock = z.object({ type: z.literal("paragraph"), text: str(1, 4000) });
export const listBlock = z.object({ type: z.literal("list"), ordered: z.boolean(), items: z.array(str(1, 400)).min(1).max(30) });
export const calloutBlock = z.object({ type: z.literal("callout"), title: str(0, 60), text: str(1, 1000) });
export const tableBlock = z
  .object({
    type: z.literal("table"),
    caption: str(0, 200),
    header: z.array(str(1, 60)).min(1).max(6),
    rows: z.array(z.array(str(0, 200)).max(6)).min(1).max(40),
  })
  .refine((t) => t.rows.every((r) => r.length === t.header.length), "Every row needs one cell per column");
export const faqBlock = z.object({
  type: z.literal("faq"),
  items: z.array(z.object({ q: str(1, 200), a: str(1, 1500) })).min(1).max(15),
});
export const imageBlock = z.object({
  type: z.literal("image"),
  path: z.string().regex(/^guides\/[a-z0-9-]+\.(webp|png|jpg)$/, "Upload the image first"),
  alt: str(1, 200),
  caption: str(0, 200),
});
export const ctaBlock = z.object({
  type: z.literal("cta"),
  title: str(1, 80),
  text: str(0, 200),
  label: str(1, 30),
  url: httpsUrl,
});

export const blockSchema = z.union([headingBlock, paragraphBlock, listBlock, calloutBlock, tableBlock, faqBlock, imageBlock, ctaBlock]);
export const blocksSchema = z.array(blockSchema).max(120);

export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  list: "List",
  callout: "Callout",
  table: "Table",
  faq: "FAQ",
  image: "Image",
  cta: "Product call-to-action",
};

export function emptyBlock(type: BlockType): Block {
  switch (type) {
    case "heading":
      return { type, text: "" };
    case "paragraph":
      return { type, text: "" };
    case "list":
      return { type, ordered: false, items: [""] };
    case "callout":
      return { type, title: "The short version", text: "" };
    case "table":
      return { type, caption: "", header: ["", ""], rows: [["", ""]] };
    case "faq":
      return { type, items: [{ q: "", a: "" }] };
    case "image":
      return { type, path: "", alt: "", caption: "" } as Block;
    case "cta":
      return { type, title: "", text: "", label: "", url: "https://" };
  }
}

/** URL-safe id for a heading, used for the "On this page" links. */
export function headingId(text: string, used: Set<string>): string {
  let base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "section";
  let id = base;
  let n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  base = id;
  return base;
}
