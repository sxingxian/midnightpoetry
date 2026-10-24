import Link from "next/link";
import { atLeast, requireAdmin } from "@/lib/auth";
import { normaliseProduct, type AdSettings } from "@/lib/content/types";
import { StatusPill, fmtDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireAdmin("viewer", "/admin");
  const [{ data: products }, { data: guides }, { data: settings }, { count: pendingCount }] = await Promise.all([
    supabase.from("products").select("*").order("sort_order"),
    supabase.from("guides").select("id, title, slug, status, updated_at, products(slug, name)").order("updated_at", { ascending: false }).limit(8),
    supabase.from("ad_settings").select("enabled, house_enabled, network_enabled, spots").eq("id", 1).maybeSingle(),
    profile.role === "owner" ? supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "pending") : Promise.resolve({ count: 0 }),
  ]);
  const s = settings as Pick<AdSettings, "enabled" | "house_enabled" | "network_enabled" | "spots"> | null;
  const canEdit = atLeast(profile.role, "editor");
  type G = { id: string; title: string; slug: string; status: string; updated_at: string; products: { slug: string; name: string } | null };
  return (
    <>
      <div className="a-top">
        <div className="a-row">
          <h1>Content</h1>
          <span className="pill warn mono" style={{ letterSpacing: "0.08em" }}>
            PRODUCTION
          </span>
        </div>
        {canEdit ? (
          <div className="a-row">
            <Link href="/admin/products/new" className="a-btn">
              New product
            </Link>
            <Link href="/admin/guides/new" className="a-btn primary">
              New guide
            </Link>
          </div>
        ) : null}
      </div>
      {sp.denied ? <p className="a-alert warn a-section">You don&apos;t have access to that page.</p> : null}
      {pendingCount ? (
        <p className="a-alert warn a-section">
          {pendingCount} {pendingCount === 1 ? "person is" : "people are"} waiting for access. <Link href="/admin/users">Review</Link>
        </p>
      ) : null}

      <section className="a-section" aria-labelledby="p-h">
        <h2 id="p-h">Products on the landing page</h2>
        <div className="a-grid">
          {(products ?? []).map(normaliseProduct).map((p) => (
            <Link key={p.id} href={`/admin/products/${p.id}`} className="a-panel" style={{ textDecoration: "none", color: "var(--a-ink)", display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="a-row" style={{ fontWeight: 600 }}>
                <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", background: p.accent_dark }} />
                {p.name}
              </span>
              <span style={{ fontSize: 13, color: "var(--a-muted)" }}>{p.kind}</span>
              <StatusPill status={p.status} />
            </Link>
          ))}
        </div>
      </section>

      <section className="a-section a-panel a-row" style={{ justifyContent: "space-between", borderColor: "rgba(242,182,97,.22)" }} aria-labelledby="ads-h">
        <span>
          <h2 id="ads-h" style={{ margin: 0, fontSize: 14 }}>
            Ads on guides · {s?.enabled ? "On" : "Off"}
          </h2>
          <span className="a-help">
            {[s?.house_enabled ? "Sponsor & house ads" : null, s?.network_enabled ? "Google AdSense for empty spots" : null].filter(Boolean).join(" · ") || "No sources on"} · never on the landing page or in the apps
          </span>
        </span>
        <Link href="/admin/ads" className="a-btn">
          Manage ads
        </Link>
      </section>

      <section className="a-section" aria-labelledby="g-h">
        <div className="a-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <h2 id="g-h" style={{ margin: 0, fontSize: 14, color: "var(--a-ink2)" }}>
            Recently edited guides
          </h2>
          <Link href="/admin/guides">All guides</Link>
        </div>
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {((guides ?? []) as unknown as G[]).map((g) => (
                <tr key={g.id}>
                  <td>
                    <Link href={`/admin/guides/${g.id}`} style={{ color: "var(--a-ink)", textDecoration: "none" }}>
                      {g.title}
                    </Link>
                    <span className="a-sub">
                      /guides/{g.products?.slug}/{g.slug}
                    </span>
                  </td>
                  <td data-label="Status">
                    <StatusPill status={g.status} />
                  </td>
                  <td data-label="Updated" className="mono" style={{ fontSize: 12, color: "var(--a-muted)" }}>
                    {fmtDate(g.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
