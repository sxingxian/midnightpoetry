import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { blocksSchema } from "@/lib/content/blocks";

/** The guides shipped in content/guides/*.json must pass the same checks the admin editor applies. */
const files = readdirSync("content/guides").filter((f) => f.endsWith(".json"));
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("studio guide content", () => {
  for (const file of files) {
    const d = JSON.parse(readFileSync(`content/guides/${file}`, "utf8"));
    describe(file, () => {
      it("has a valid product and categories", () => {
        expect(d.product.slug).toMatch(SLUG);
        for (const k of ["accent_dark", "accent_light", "button_dark", "button_light"]) expect(d.product[k]).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(d.product.description.length).toBeLessThanOrEqual(400);
        expect(d.product.highlights.length).toBeLessThanOrEqual(3);
        for (const c of d.categories) expect(c.slug).toMatch(SLUG);
      });
      for (const g of d.guides) {
        it(`guide ${g.slug} is valid`, () => {
          expect(g.slug).toMatch(SLUG);
          expect(g.slug.length).toBeLessThanOrEqual(80);
          expect(g.title.length).toBeGreaterThan(0);
          expect(g.title.length).toBeLessThanOrEqual(140);
          expect(g.standfirst.length).toBeLessThanOrEqual(400);
          expect(g.meta_title.length).toBeLessThanOrEqual(70);
          expect(g.meta_description.length).toBeLessThanOrEqual(170);
          expect(d.categories.some((c: { slug: string }) => c.slug === g.category)).toBe(true);
          const parsed = blocksSchema.safeParse(g.blocks);
          if (!parsed.success) throw new Error(JSON.stringify(parsed.error.issues.slice(0, 3)));
          expect(JSON.stringify(g.blocks)).not.toMatch(/Singapore/i);
        });
      }
      it("has unique guide slugs", () => {
        const slugs = d.guides.map((g: { slug: string }) => g.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
      });
    });
  }

  it("the generated migrations are up to date, and every content file ships in one", () => {
    const outs = ["supabase/migrations/20261024000300_studio_content.sql", "supabase/migrations/20261025000100_zora_content.sql", "supabase/migrations/20261028000100_zotikos_content.sql", "supabase/migrations/20261102000100_zotikos_guides_update.sql", "supabase/migrations/20261102000200_zotikos_insights_guides.sql"];
    const before = outs.map((o) => readFileSync(o, "utf8"));
    execFileSync("node", ["scripts/content-sql.mjs"]);
    outs.forEach((o, i) => expect(readFileSync(o, "utf8")).toBe(before[i]));
    const shipped = readFileSync("scripts/content-sql.mjs", "utf8");
    for (const f of files) expect(shipped).toContain(`"${f}"`);
  });
});
