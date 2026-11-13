import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { planAds, readableOn, contrast, adLimitForWords } from "@/lib/ads";
import { DEFAULT_PAGES, SITE_PAGE_SLUGS, contactEmailSchema, parsePageBody } from "@/lib/content/site-pages";
import { tokenize, safeHref } from "@/lib/content/inline-parse";
import { blocksSchema, httpsUrl } from "@/lib/content/blocks";
import { adsenseCsp, strictCsp } from "@/lib/csp";
import { sniffImage } from "@/lib/admin/media";
import type { Ad, AdSettings } from "@/lib/content/types";

const settings: AdSettings = {
  enabled: true,
  house_enabled: true,
  network_enabled: false,
  spots: ["inline", "side", "hub"],
  max_per_page: 2,
  excluded_category_ids: ["privacy-cat"],
  adsense_client: null,
  adsense_units: {},
};
const ad = (over: Partial<Ad>): Ad => ({
  id: Math.random().toString(36),
  name: "x",
  kind: "house",
  sponsor_name: "",
  eyebrow: "",
  headline: "h",
  body: "",
  cta_label: "Go",
  url: "https://example.com",
  image_path: null,
  spots: ["inline", "side"],
  starts_at: null,
  ends_at: null,
  status: "live",
  ...over,
});

describe("planAds", () => {
  it("prefers sponsors over house ads and respects the page limit", () => {
    const plan = planAds({ settings, ads: [ad({ kind: "house" }), ad({ kind: "sponsor", sponsor_name: "S" })], spots: ["inline", "side", "end"] });
    expect(plan.length).toBe(2);
    expect(plan[0]!.source === "direct" && plan[0]!.ad.kind).toBe("sponsor");
  });
  it("shows nothing when ads are off, the guide opts out or the topic is excluded", () => {
    const ads = [ad({})];
    expect(planAds({ settings: { ...settings, enabled: false }, ads, spots: ["inline"] })).toEqual([]);
    expect(planAds({ settings, ads, spots: ["inline"], guideAdsEnabled: false })).toEqual([]);
    expect(planAds({ settings, ads, spots: ["inline"], categoryId: "privacy-cat" })).toEqual([]);
  });
  it("skips ads that haven't started, have ended or aren't https", () => {
    const now = new Date("2026-10-24T00:00:00Z");
    const ads = [ad({ starts_at: "2026-11-01T00:00:00Z" }), ad({ ends_at: "2026-10-01T00:00:00Z" }), ad({ url: "http://x.com" })];
    expect(planAds({ settings, ads, spots: ["inline"], now })).toEqual([]);
  });
  it("falls back to AdSense only for unbooked spots with a configured unit", () => {
    const s: AdSettings = { ...settings, network_enabled: true, adsense_client: "ca-pub-0000000000000000", adsense_units: { side: "1234567890" } };
    const plan = planAds({ settings: s, ads: [ad({ spots: ["inline"] })], spots: ["inline", "side"] });
    expect(plan.map((p) => p.source)).toEqual(["direct", "adsense"]);
  });
  it("never repeats the same direct ad on one page", () => {
    const one = ad({ spots: ["inline", "side"] });
    const plan = planAds({ settings, ads: [one], spots: ["inline", "side"] });
    expect(plan.length).toBe(1);
  });
});

describe("ads and page length", () => {
  it("keeps ads off short pages and limits them on medium ones", () => {
    expect([adLimitForWords(120), adLimitForWords(299), adLimitForWords(300), adLimitForWords(599), adLimitForWords(600)]).toEqual([0, 0, 1, 1, Infinity]);
    const ads = [ad({ spots: ["inline"] }), ad({ spots: ["side"] })];
    expect(planAds({ settings, ads, spots: ["inline", "side"], words: 160 })).toEqual([]);
    expect(planAds({ settings, ads, spots: ["inline", "side"], words: 450 }).length).toBe(1);
    expect(planAds({ settings, ads, spots: ["inline", "side"], words: 900 }).length).toBe(2);
  });
});

describe("standing pages", () => {
  it("turns plain text into headings, paragraphs and lists", () => {
    const r = parsePageBody("Intro line one\nstill the intro.\n\n## What we do\n- one\n- two\n\n1. first\n2) second\n<script>alert(1)</script>");
    expect(r.blocks).toEqual([
      { type: "paragraph", text: "Intro line one still the intro." },
      { type: "heading", text: "What we do" },
      { type: "list", ordered: false, items: ["one", "two"] },
      { type: "list", ordered: true, items: ["first", "second"] },
      { type: "paragraph", text: "<script>alert(1)</script>" }, // kept as text: React escapes it, nothing is ever rendered as HTML
    ]);
  });
  it("refuses empty or oversized text with a plain message", () => {
    expect(parsePageBody("  \n ").error).toBe("The page is empty.");
    expect(parsePageBody("## " + "x".repeat(130)).error).toMatch(/^A heading/);
    expect(parsePageBody("y".repeat(4100)).error).toMatch(/^A paragraph/);
  });
  it("has complete built-in pages with no placeholders, seeded word for word by the migration", () => {
    const sql = readFileSync("supabase/migrations/20261113000100_site_pages.sql", "utf8");
    for (const slug of SITE_PAGE_SLUGS) {
      const page = DEFAULT_PAGES[slug];
      expect(parsePageBody(page.body).error, slug).toBeUndefined();
      expect(page.body, slug).not.toMatch(/\[[^\]]*(to complete|todo|contact email|tbd)[^\]]*\]|lorem ipsum|Singapore/i);
      expect(page.body.split(/\s+/).length, slug).toBeGreaterThan(200);
      expect(sql, slug).toContain(`values ('${slug}', '${page.title}', $mp$${page.body}$mp$)`);
    }
    for (const needle of ["IP address", "web beacons", "Third-party vendors, including Google, use cookies", "https://www.google.com/settings/ads", "https://policies.google.com/technologies/partner-sites", "children under 13"]) {
      expect(DEFAULT_PAGES.privacy.body).toContain(needle);
    }
  });
  it("only accepts a plain email address for the public contact", () => {
    expect(contactEmailSchema.parse("")).toBeNull();
    expect(contactEmailSchema.parse(" hello@midnightpoetry.studio ")).toBe("hello@midnightpoetry.studio");
    for (const bad of ["nope", "a@b", "a b@c.com", "x@y.com\nBcc: z@y.com", "x@y.com?subject=hi", "<a@b.com>", "javascript:alert(1)@x.com"]) expect(contactEmailSchema.safeParse(bad).success, bad).toBe(false);
  });
});

describe("inline text", () => {
  it("formats bold, italic and safe links only", () => {
    const t = tokenize("Hi **there** and *you*, see [docs](https://x.com) or [bad](javascript:alert(1))");
    expect(t.filter((x) => x.kind === "strong").length).toBe(1);
    expect(t.filter((x) => x.kind === "em").length).toBe(1);
    const links = t.filter((x) => x.kind === "link");
    expect(links).toEqual([{ kind: "link", text: "docs", href: "https://x.com/" }]);
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("//evil.com")).toBeNull();
    expect(safeHref("/\\evil.com")).toBeNull();
    expect(safeHref("/\tevil")).toBeNull();
    expect(safeHref("https://x.com/a\\b")).toBeNull();
    expect(safeHref("/guides")).toBe("/guides");
    expect(safeHref("https://user:pw@x.com")).toBeNull();
  });
});

describe("blocks", () => {
  it("accepts valid guides and rejects unsafe or malformed content", () => {
    expect(blocksSchema.safeParse([{ type: "heading", text: "Hi" }]).success).toBe(true);
    expect(blocksSchema.safeParse([{ type: "html", html: "<script>" }]).success).toBe(false);
    expect(blocksSchema.safeParse([{ type: "cta", title: "t", text: "", label: "l", url: "javascript:alert(1)" }]).success).toBe(false);
    expect(blocksSchema.safeParse([{ type: "table", caption: "", header: ["a", "b"], rows: [["1"]] }]).success).toBe(false);
    expect(blocksSchema.safeParse([{ type: "image", path: "../../etc/passwd", alt: "x", caption: "" }]).success).toBe(false);
    expect(httpsUrl.safeParse("http://x.com").success).toBe(false);
  });
});

describe("security policy", () => {
  it("is strict by default and only loosened for AdSense", () => {
    const s = strictCsp({ nonce: "abc", supabaseUrl: "https://p.supabase.co" });
    expect(s).toContain("'nonce-abc' 'strict-dynamic'");
    expect(s).not.toContain("unsafe-eval");
    expect(s).toContain("frame-ancestors 'none'");
    expect(s).toContain("connect-src 'self' https://p.supabase.co wss://p.supabase.co");
    expect(adsenseCsp({ nonce: "abc" })).toContain("'strict-dynamic'");
  });
});

describe("uploads", () => {
  it("identifies images by their bytes", () => {
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0]))?.ext).toBe("png");
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(sniffImage(new TextEncoder().encode("RIFF1234WEBPVP8 "))?.ext).toBe("webp");
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});

describe("colours", () => {
  it("picks readable button text", () => {
    for (const c of ["#6E5CF0", "#5546D6", "#1F1D1A", "#F8F0E1", "#F2B661"]) expect(contrast(c, readableOn(c))).toBeGreaterThanOrEqual(4.5);
  });
});

import { describeIssue } from "@/lib/admin/result";
import { z } from "zod";

describe("admin validation messages", () => {
  it("are written for people", () => {
    const empty = z.object({ title: z.string().min(1) }).safeParse({ title: "" });
    expect(describeIssue(empty.error?.issues[0])).toBe("Title is empty.");
    const long = z.object({ meta_title: z.string().max(70) }).safeParse({ meta_title: "x".repeat(80) });
    expect(describeIssue(long.error?.issues[0])).toBe("Search title is too long (up to 70 characters).");
    const own = z.object({ adsense_client: z.string().regex(/^ca-pub-\d{16}$/, "The publisher ID looks like ca-pub- followed by 16 digits.") }).safeParse({ adsense_client: "x" });
    expect(describeIssue(own.error?.issues[0])).toBe("The publisher ID looks like ca-pub- followed by 16 digits.");
  });
  it("accepts ad unit IDs for only some spots", async () => {
    const units = z.partialRecord(z.enum(["inline", "end", "side", "hub"]), z.string().regex(/^\d{6,20}$/));
    expect(units.safeParse({ inline: "1234567890" }).success).toBe(true);
  });
});
