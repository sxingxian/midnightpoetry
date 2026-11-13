import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { SavedVersion } from "@/components/admin/SavedVersion";
import { SiteSettingsForm } from "@/components/admin/SiteForms";
import { fmtDate } from "@/components/admin/ui";
import { DEFAULT_PAGES, SITE_PAGE_SLUGS } from "@/lib/content/site-pages";

export const dynamic = "force-dynamic";
export const metadata = { title: "Site & pages" };

export default async function SiteAdminPage() {
  const { supabase, profile } = await requireAdmin("viewer", "/admin/site");
  const [{ data: site }, { data: ads }, { data: pages }] = await Promise.all([
    supabase.from("site_settings").select("contact_email, updated_at").eq("id", 1).maybeSingle(),
    supabase.from("ad_settings").select("enabled, adsense_client, updated_at").eq("id", 1).maybeSingle(),
    supabase.from("site_pages").select("slug, title, updated_at"),
  ]);
  const bySlug = new Map(((pages ?? []) as { slug: string; title: string; updated_at: string }[]).map((p) => [p.slug, p]));
  const isOwner = profile.role === "owner";
  const email = (site?.contact_email as string | null) ?? "";
  const client = (ads?.adsense_client as string | null) ?? "";
  const ready = [
    { ok: !!email, label: "Contact email is set" },
    { ok: !!client, label: "AdSense publisher ID is set (ads.txt and the verification tag follow from it)" },
    { ok: SITE_PAGE_SLUGS.every((s) => bySlug.has(s)), label: "About, Contact, Privacy and Terms are published" },
  ];
  return (
    <>
      <div className="a-top">
        <div className="a-row">
          <h1>Site &amp; pages</h1>
          <span className={`pill ${ads?.enabled ? "ok" : ""}`}>Ads {ads?.enabled ? "on" : "off"}</span>
        </div>
      </div>
      <div className="a-layout">
        <div className="main">
          {site && ads ? (
            <SavedVersion version={`${site.updated_at}|${ads.updated_at}`}>
              <SiteSettingsForm contactEmail={email} adsenseClient={client} adsEnabled={!!ads.enabled} isOwner={isOwner} />
            </SavedVersion>
          ) : (
            <p className="a-alert err">Site settings are missing — run the database migration (Actions › Deploy Supabase).</p>
          )}
          <section aria-labelledby="pages-h" className="a-panel" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 id="pages-h" style={{ margin: "0 0 8px", fontSize: 14 }}>
              Pages
            </h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {SITE_PAGE_SLUGS.map((slug) => {
                const p = bySlug.get(slug);
                return (
                  <li key={slug} className="a-row" style={{ justifyContent: "space-between", flexWrap: "wrap", padding: "10px 0", borderTop: "1px solid var(--a-line)" }}>
                    <span>
                      <Link href={`/admin/site/${slug}`} style={{ color: "var(--a-ink)", textDecoration: "none", fontWeight: 600 }}>
                        {p?.title ?? DEFAULT_PAGES[slug].title}
                      </Link>
                      <span className="a-sub">
                        /{slug} · {p ? `updated ${fmtDate(p.updated_at)}` : "showing the built-in text"}
                      </span>
                    </span>
                    <span className="a-row">
                      <Link href={`/${slug}`} target="_blank" className="a-btn sm">
                        View
                      </Link>
                      <Link href={`/admin/site/${slug}`} className="a-btn sm primary">
                        {isOwner ? "Edit" : "Open"}
                      </Link>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
        <div className="aside">
          <section className="a-panel" aria-labelledby="ready-h">
            <h2 id="ready-h" style={{ margin: "0 0 10px", fontSize: 14 }}>
              Before asking AdSense to review
            </h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--a-ink2)" }}>
              {ready.map((r) => (
                <li key={r.label} style={{ display: "flex", gap: 8 }}>
                  <span aria-hidden="true" style={{ color: r.ok ? "var(--a-ok)" : "var(--a-warn)" }}>
                    {r.ok ? "✓" : "○"}
                  </span>
                  <span>
                    {r.label}
                    <span className="a-sub">{r.ok ? "Done" : "To do"}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="a-help" style={{ margin: "12px 0 0" }}>
              Keep “Show ads on guides” off during the review, so no page shows an empty ad space. Ad spots, sponsors and AdSense units are under{" "}
              <Link href="/admin/ads" style={{ color: "inherit" }}>
                Ads on guides
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
