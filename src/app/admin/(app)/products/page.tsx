import Link from "next/link";
import { requireAdmin, atLeast } from "@/lib/auth";
import { normaliseProduct } from "@/lib/content/types";
import { StatusPill } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const { supabase, profile } = await requireAdmin("viewer", "/admin/products");
  const { data } = await supabase.from("products").select("*").order("sort_order");
  const products = (data ?? []).map(normaliseProduct);
  return (
    <>
      <div className="a-top">
        <h1>Products</h1>
        {atLeast(profile.role, "editor") ? (
          <Link href="/admin/products/new" className="a-btn primary">
            New product
          </Link>
        ) : null}
      </div>
      <div className="a-section a-grid">
        {products.map((p) => (
          <Link key={p.id} href={`/admin/products/${p.id}`} className="a-panel" style={{ display: "flex", flexDirection: "column", gap: 10, textDecoration: "none", color: "var(--a-ink)" }}>
            <span className="a-row" style={{ justifyContent: "space-between" }}>
              <span className="a-row" style={{ fontSize: 16, fontWeight: 600 }}>
                <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", background: p.accent_dark }} />
                {p.name}
              </span>
              <span className="mono" style={{ fontSize: 11, color: "var(--a-muted)" }}>
                #{p.sort_order}
              </span>
            </span>
            <span style={{ fontSize: 13, color: "var(--a-muted)" }}>{p.kind}</span>
            <span className="a-row">
              <StatusPill status={p.status} />
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
