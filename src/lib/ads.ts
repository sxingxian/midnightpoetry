import type { Ad, AdSettings, AdSpot } from "@/lib/content/types";

export type PlannedAd = { spot: AdSpot; source: "direct"; ad: Ad } | { spot: AdSpot; source: "adsense"; client: string; unit: string };

/**
 * Decide what fills each ad spot on a page.
 * Order: sponsor ads, then house ads, then AdSense (only for spots nobody booked).
 * Respects the master switch, the page's allowed spots, excluded topics and the
 * per-page limit, and never shows the same direct ad twice on one page.
 */
export function planAds(input: {
  settings: AdSettings | null;
  ads: Ad[];
  spots: AdSpot[];
  categoryId?: string | null;
  guideAdsEnabled?: boolean;
  seed?: string;
  now?: Date;
}): PlannedAd[] {
  const { settings, ads } = input;
  if (!settings || !settings.enabled) return [];
  if (input.guideAdsEnabled === false) return [];
  if (input.categoryId && settings.excluded_category_ids.includes(input.categoryId)) return [];

  const now = input.now ?? new Date();
  const running = ads.filter(
    (a) =>
      a.status === "live" &&
      (!a.starts_at || new Date(a.starts_at) <= now) &&
      (!a.ends_at || new Date(a.ends_at) > now) &&
      a.url.startsWith("https://"),
  );
  const allowed = input.spots.filter((s) => settings.spots.includes(s));
  const used = new Set<string>();
  const plan: PlannedAd[] = [];
  const seed = hash(input.seed ?? now.toISOString().slice(0, 10));

  for (const spot of allowed) {
    if (plan.length >= settings.max_per_page) break;
    let picked: Ad | undefined;
    if (settings.house_enabled) {
      for (const kind of ["sponsor", "house"] as const) {
        const pool = running.filter((a) => a.kind === kind && a.spots.includes(spot) && !used.has(a.id));
        if (pool.length) {
          picked = pool[(seed + plan.length) % pool.length];
          break;
        }
      }
    }
    if (picked) {
      used.add(picked.id);
      plan.push({ spot, source: "direct", ad: picked });
      continue;
    }
    const unit = settings.adsense_units?.[spot];
    if (settings.network_enabled && settings.adsense_client && unit && /^\d{6,20}$/.test(unit)) {
      plan.push({ spot, source: "adsense", client: settings.adsense_client, unit });
    }
  }
  return plan;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/** Text colour (white or near-black) with the better contrast on a given button colour. */
export function readableOn(hex: string): string {
  return contrast(hex, "#FFFFFF") >= contrast(hex, "#16161B") ? "#FFFFFF" : "#16161B";
}
