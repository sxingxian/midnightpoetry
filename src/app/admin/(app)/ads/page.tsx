import Link from "next/link";
import { atLeast, requireAdmin } from "@/lib/auth";
import type { Ad, AdSettings, Category } from "@/lib/content/types";
import { AdSettingsForm } from "@/components/admin/AdSettingsForm";
import { StatusPill, fmtDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ads on guides" };

export default async function AdsPage() {
  const { supabase, profile } = await requireAdmin("viewer", "/admin/ads");
  const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [{ data: settings }, { data: ads }, { data: cats }, { data: clicks }] = await Promise.all([
    supabase.from("ad_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("ads").select("*").order("updated_at", { ascending: false }),
    supabase.from("categories").select("*, products(name)").order("sort_order"),
    supabase.from("ad_clicks").select("ad_id, clicks").gte("day", since),
  ]);
  const clickMap = new Map<string, number>();
  for (const c of clicks ?? []) clickMap.set(c.ad_id, (clickMap.get(c.ad_id) ?? 0) + c.clicks);
  const categories = ((cats ?? []) as (Category & { products: { name: string } | null })[]).map((c) => ({ ...c, product: c.products?.name ?? "" }));
  const s = settings as AdSettings | null;
  return (
    <>
      <div className="a-top">
        <div className="a-row">
          <h1>Ads on guides</h1>
          <span className={`pill ${s?.enabled ? "ok" : ""}`}>{s?.enabled ? "On" : "Off"}</span>
        </div>
        <Link href="/guides" className="a-btn" target="_blank">
          View guides
        </Link>
      </div>
      <div className="a-layout">
        <div className="main">
          {s ? <AdSettingsForm settings={s} categories={categories} isOwner={profile.role === "owner"} /> : <p className="a-alert err">Ad settings are missing — run the database migration.</p>}
        </div>
        <div className="aside">
          <section className="a-panel" aria-labelledby="lib-h" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="a-row" style={{ justifyContent: "space-between" }}>
              <h2 id="lib-h" style={{ margin: 0, fontSize: 14 }}>
                Sponsor &amp; house ads
              </h2>
              {atLeast(profile.role, "editor") ? (
                <Link href="/admin/ads/new" className="a-btn sm primary">
                  New ad
                </Link>
              ) : null}
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {((ads ?? []) as (Ad & { updated_at: string })[]).map((a) => (
                <li key={a.id} style={{ paddingBottom: 10, borderBottom: "1px solid var(--a-line)" }}>
                  <Link href={`/admin/ads/${a.id}`} style={{ color: "var(--a-ink)", textDecoration: "none" }}>
                    {a.name}
                  </Link>
                  <span className="a-sub">{a.url.replace(/^https:\/\//, "").slice(0, 48)}</span>
                  <span className="a-row" style={{ marginTop: 6 }}>
                    <StatusPill status={a.status} />
                    <span className="pill">{a.kind === "sponsor" ? "Sponsor" : "House"}</span>
                    <span className="pill">{clickMap.get(a.id) ?? 0} clicks · 30 days</span>
                  </span>
                  {a.ends_at ? <span className="a-sub">Ends {fmtDate(a.ends_at)}</span> : null}
                </li>
              ))}
              {!ads?.length ? <li className="a-help">No ads yet.</li> : null}
            </ul>
            <p className="a-help" style={{ margin: 0 }}>
              Clicks are counted on our own server, with no cookies or tracking pixels. AdSense results are in your AdSense account.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
