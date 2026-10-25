import Script from "next/script";
import { headers } from "next/headers";
import type { PlannedAd } from "@/lib/ads";
import { publicEnv } from "@/lib/env";
import { AdSenseUnit } from "./AdSenseUnit";

/** One ad spot. Direct ads link through our click counter; AdSense renders Google's unit. */
export function AdSlot({ plan, variant = "wide" }: { plan: PlannedAd | undefined; variant?: "wide" | "side" }) {
  if (!plan) return null;
  if (plan.source === "adsense") {
    return (
      <aside className={`ad ${variant === "side" ? "side" : ""}`} aria-label="Advertisement">
        <p className="ad-label">Advertisement</p>
        <AdSenseUnit client={plan.client} slot={plan.unit} />
      </aside>
    );
  }
  const ad = plan.ad;
  const img = ad.image_path ? `${publicEnv().supabaseUrl}/storage/v1/object/public/media/${ad.image_path}` : null;
  return (
    <aside className={`ad ${variant === "side" ? "side" : ""}`} aria-label="Advertisement">
      <p className="ad-label">Advertisement</p>
      <a className="ad-box" href={`/api/ads/click/${ad.id}`} rel="sponsored noopener" target="_blank">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element -- images are pre-sized WebP from storage
          <img className="ad-img" src={img} alt="" width={96} height={96} loading="lazy" decoding="async" />
        ) : null}
        <span style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="ad-eyebrow">{ad.kind === "sponsor" && ad.sponsor_name ? `Sponsored by ${ad.sponsor_name}` : ad.eyebrow || "From the studio"}</span>
          <span className="ad-head">{ad.headline}</span>
          {ad.body ? <span className="ad-body">{ad.body}</span> : null}
        </span>
        <span className="ad-cta">{ad.cta_label}</span>
      </a>
    </aside>
  );
}

/**
 * True when this response's security policy lets Google's ads load (decided in middleware).
 * Guide pages pass network ads to planAds only then; otherwise house and sponsor ads fill in.
 */
export async function adsenseAllowed(): Promise<boolean> {
  return (await headers()).get("x-adsense") === "on";
}

/** Loads Google's AdSense script (with the page nonce) only when a page actually has an AdSense unit. */
export async function AdSenseScript({ plans }: { plans: PlannedAd[] }) {
  const first = plans.find((p) => p.source === "adsense");
  if (!first || first.source !== "adsense") return null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <Script
      id="adsense"
      async
      strategy="afterInteractive"
      nonce={nonce}
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(first.client)}`}
    />
  );
}
