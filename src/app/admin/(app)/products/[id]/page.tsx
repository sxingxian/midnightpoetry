import { notFound } from "next/navigation";
import { z } from "zod";
import { atLeast, requireAdmin } from "@/lib/auth";
import { normaliseProduct, type Category } from "@/lib/content/types";
import { ProductForm } from "@/components/admin/ProductForm";
import { CategoryEditor } from "@/components/admin/CategoryEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, profile } = await requireAdmin("viewer", `/admin/products/${id}`);
  const [{ data }, { data: cats }] = await Promise.all([supabase.from("products").select("*").eq("id", id).maybeSingle(), supabase.from("categories").select("*").eq("product_id", id).order("sort_order")]);
  if (!data) notFound();
  const product = normaliseProduct(data);
  const canEdit = atLeast(profile.role, "editor");
  return (
    <>
      <div className="a-top">
        <h1>{product.name}</h1>
        {sp.saved ? (
          <span className="pill ok" role="status">
            Created
          </span>
        ) : null}
      </div>
      <div className="a-layout">
        <div className="main">
          <ProductForm product={product} canEdit={canEdit} />
        </div>
        <div className="aside">
          <CategoryEditor productId={product.id} categories={(cats ?? []) as Category[]} canEdit={canEdit} />
        </div>
      </div>
    </>
  );
}
