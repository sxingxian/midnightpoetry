import Link from "next/link";
import { atLeast, requireAdmin } from "@/lib/auth";
import { StatusPill, fmtDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Guides" };

const FILTERS = [
  ["all", "All"],
  ["published", "Published"],
  ["draft", "Drafts"],
  ["scheduled", "Scheduled"],
  ["archived", "Archived"],
] as const;

export default async function GuidesAdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = FILTERS.some(([k]) => k === sp.status) ? sp.status! : "all";
  const { supabase, profile } = await requireAdmin("viewer", "/admin/guides");
  let q = supabase.from("guides").select("id, slug, title, status, publish_at, updated_at, meta_description, product_id, products(slug, name, accent_dark), categories(name)").order("updated_at", { ascending: false }).limit(300);
  if (status !== "all") q = q.eq("status", status);
  const { data } = await q;
  type Row = { id: string; slug: string; title: string; status: string; publish_at: string | null; updated_at: string; meta_description: string; products: { slug: string; name: string; accent_dark: string } | null; categories: { name: string } | null };
  const rows = (data ?? []) as unknown as Row[];
  return (
    <>
      <div className="a-top">
        <h1>Guides</h1>
        {atLeast(profile.role, "editor") ? (
          <Link href="/admin/guides/new" className="a-btn primary">
            New guide
          </Link>
        ) : null}
      </div>
      <nav aria-label="Filter by status" className="a-row a-section">
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={k === "all" ? "/admin/guides" : `/admin/guides?status=${k}`} className="a-btn sm" aria-current={status === k ? "page" : undefined} style={status === k ? { background: "var(--a-ink)", color: "var(--a-bg)" } : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="a-section a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Product</th>
              <th scope="col">Category</th>
              <th scope="col">Status</th>
              <th scope="col">Checks</th>
              <th scope="col">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/guides/${r.id}`} style={{ color: "var(--a-ink)", textDecoration: "none" }}>
                    {r.title}
                  </Link>
                  <span className="a-sub">
                    /guides/{r.products?.slug}/{r.slug}
                  </span>
                </td>
                <td data-label="Product">
                  <span className="a-row" style={{ gap: 6 }}>
                    <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: r.products?.accent_dark }} />
                    {r.products?.name}
                  </span>
                </td>
                <td data-label="Category" style={{ color: "var(--a-ink2)" }}>{r.categories?.name ?? "—"}</td>
                <td data-label="Status">
                  <StatusPill status={r.status} />
                  {r.status === "scheduled" ? <span className="a-sub">{fmtDate(r.publish_at)}</span> : null}
                </td>
                <td data-label="Checks" style={{ color: r.meta_description.length >= 70 ? "var(--a-muted)" : "var(--a-warn)" }}>{r.meta_description.length >= 70 ? "Ready" : "Missing search description"}</td>
                <td data-label="Updated" className="mono" style={{ fontSize: 12, color: "var(--a-muted)" }}>
                  {fmtDate(r.updated_at)}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: "var(--a-muted)" }}>
                  No guides here yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
